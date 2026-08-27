-- Prevent a mobile number from being used for more than one participant.
-- Resolve any phone values returned by this preflight query before applying:
-- select phone, count(*) from public.participants group by phone having count(*) > 1;

create unique index if not exists participants_phone_unique_idx
  on public.participants (phone);
