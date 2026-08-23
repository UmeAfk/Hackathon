create table if not exists public.api_rate_limits (
  key_hash text not null check (char_length(key_hash) = 64),
  route text not null check (char_length(route) between 1 and 80),
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (key_hash, route, window_start)
);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from anon, authenticated;
create index if not exists api_rate_limits_window_idx on public.api_rate_limits(window_start);
create index if not exists participant_tokens_expiry_idx on public.participant_tokens(expires_at);

delete from public.participant_tokens where expires_at < now();

create or replace function public.consume_api_rate_limit(
  p_key_hash text,
  p_route text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket_start timestamptz;
  current_count integer;
begin
  if char_length(p_key_hash) <> 64
     or char_length(p_route) not between 1 and 80
     or p_window_seconds not between 10 and 86400
     or p_limit not between 1 and 10000 then
    return false;
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits (key_hash, route, window_start, request_count)
  values (p_key_hash, p_route, bucket_start, 1)
  on conflict (key_hash, route, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into current_count;

  delete from public.api_rate_limits
  where window_start < clock_timestamp() - interval '2 days';

  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;
