alter table public.participants add column if not exists resend_contact_id text;
alter table public.participants add column if not exists resend_synced_at timestamptz;
alter table public.participants add column if not exists resend_sync_error text;
