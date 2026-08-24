-- Re-assert the production submission-bucket guard for projects where the
-- earlier bucket migrations have already been applied.
update storage.buckets
set public = false,
    file_size_limit = 5368709120
where id = 'challenge-submissions';
