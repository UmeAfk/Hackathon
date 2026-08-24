-- The application enforces a 5 GiB maximum for each participant's single archive.
-- Keep a Storage-level 5 GiB ceiling as defense in depth alongside the API check.
-- In Supabase Storage Settings, set Global file size limit to at least 6 GB first;
-- this avoids a decimal-GB versus binary-GiB mismatch in the dashboard.

update storage.buckets
set public = false,
    file_size_limit = 5368709120
where id = 'challenge-submissions';
