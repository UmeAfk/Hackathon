create extension if not exists citext with schema extensions;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email extensions.citext not null unique,
  phone text not null check (char_length(phone) between 7 and 30),
  age_confirmed boolean not null default false,
  terms_accepted boolean not null default false,
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email_opt_out_at timestamptz,
  resend_contact_id text,
  resend_synced_at timestamptz,
  resend_sync_error text
);

alter table public.participants add column if not exists resend_contact_id text;
alter table public.participants add column if not exists resend_synced_at timestamptz;
alter table public.participants add column if not exists resend_sync_error text;

create table if not exists public.participant_tokens (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  purpose text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index if not exists participant_tokens_participant_idx on public.participant_tokens(participant_id);
create index if not exists participant_tokens_active_idx on public.participant_tokens(token_hash, expires_at) where revoked_at is null;
create index if not exists participant_tokens_expiry_idx on public.participant_tokens(expires_at);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade,
  uploader_name text,
  uploader_email extensions.citext,
  design_brief text check (design_brief is null or char_length(design_brief) <= 2000),
  ai_usage text check (ai_usage is null or ai_usage in ('none', 'concept', 'textures')),
  original_filename text,
  storage_path text unique,
  file_size bigint check (file_size is null or file_size > 0),
  mime_type text,
  status text not null default 'draft' check (status in ('draft', 'initiated', 'uploaded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  uploaded_at timestamptz,
  receipt_sent_at timestamptz
);
create index if not exists submissions_status_idx on public.submissions(status, uploaded_at);

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  email_type text not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  provider_id text,
  error text,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (participant_id, email_type)
);
create index if not exists email_deliveries_campaign_idx on public.email_deliveries(email_type, status);

alter table public.participants enable row level security;
alter table public.participant_tokens enable row level security;
alter table public.submissions enable row level security;
alter table public.email_deliveries enable row level security;

revoke all on table public.participants from anon, authenticated;
revoke all on table public.participant_tokens from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;
revoke all on table public.email_deliveries from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('challenge-submissions', 'challenge-submissions', false, 5368709120)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

insert into storage.buckets (id, name, public)
values ('challenge-assets', 'challenge-assets', false)
on conflict (id) do update set public = false;

-- No public storage.objects policies are intentional. Uploads use short-lived,
-- server-created signed upload URLs; organizer downloads use the Supabase dashboard.
-- Supabase Storage folders are virtual. Upload the finished assets with these paths:
--   challenge-assets/models/ArchViz_Base_Building_v1.0.fbx
--   challenge-assets/models/ArchViz_Base_Building_v1.0.obj
--   challenge-assets/models/ArchViz_Base_Building_v1.0.glb
