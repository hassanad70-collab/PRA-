-- Performance & Production Optimization (v1.1.5)
--
-- jobs.published_at is the sort column for every public job-board query
-- (getPublishedJobs orders by it, descending) and had no index -- every
-- request sorted the full published-jobs set at query time. Partial index
-- (only published rows) keeps it small and matches the query's own
-- status = 'published' filter.
create index if not exists jobs_published_at_idx
  on public.jobs (published_at desc)
  where status = 'published';
