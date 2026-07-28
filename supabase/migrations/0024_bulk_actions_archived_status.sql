-- ============================================================================
-- Migration 0024: add 'archived' to application_status (Recruiter
-- Intelligence v2.0, Phase 7 -- Bulk Recruiter Actions)
-- ============================================================================
--
-- Bulk "Archive" needs a terminal state distinct from both 'rejected' (an
-- explicit no) and 'withdrawn' (candidate-initiated) -- "no longer actively
-- considering, but not explicitly rejected". ALTER TYPE ... ADD VALUE must
-- be the only statement run in its transaction (a new enum value can't be
-- referenced by other DDL/DML in the same transaction that added it), so
-- this is deliberately its own migration file, separate from 0025's new
-- columns -- see docs/engineering/database-workflow.md.

alter type application_status add value if not exists 'archived';
