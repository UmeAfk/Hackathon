-- The application enforces a 5 GiB maximum for each participant's single archive.
-- The bucket inherits the project's global Storage limit so that the application
-- and resumable upload flow remain the source of the per-submission ceiling.
-- In Supabase Storage Settings, set Global file size limit to at least 5 GB first.

update storage.buckets
set public = false,
    file_size_limit = null
where id = 'challenge-submissions';
