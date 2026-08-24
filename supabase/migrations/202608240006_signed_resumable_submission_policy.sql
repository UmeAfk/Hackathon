-- Signed TUS uploads use the project's publishable key as the API gateway key.
-- Restrict the required anon INSERT/RETURNING access to paths that the trusted
-- application server has already registered as an initiated submission.

create or replace function public.is_initiated_submission_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.submissions
    where storage_path = p_name
      and status = 'initiated'
  );
$$;

revoke all on function public.is_initiated_submission_path(text) from public;
grant execute on function public.is_initiated_submission_path(text) to anon, authenticated, service_role;

drop policy if exists "initiated signed tus submission insert" on storage.objects;
create policy "initiated signed tus submission insert"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'challenge-submissions'
  and storage.allow_any_operation(array[
    'storage.tus.upload.create',
    'storage.tus.upload.part'
  ])
  and public.is_initiated_submission_path(name)
);

-- Storage's INSERT ... RETURNING flow also needs a matching SELECT policy.
-- The operation guard prevents this policy from enabling listing or downloads.
drop policy if exists "initiated signed tus submission return" on storage.objects;
create policy "initiated signed tus submission return"
on storage.objects
for select
to anon
using (
  bucket_id = 'challenge-submissions'
  and storage.allow_any_operation(array[
    'storage.tus.upload.create',
    'storage.tus.upload.part'
  ])
  and public.is_initiated_submission_path(name)
);
