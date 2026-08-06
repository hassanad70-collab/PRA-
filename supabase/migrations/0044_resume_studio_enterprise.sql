-- ============================================================
-- Resume Studio Enterprise (Phase 2)
-- ============================================================

-- 1. Extend resume_section_type enum with 6 new section types
ALTER TYPE resume_section_type ADD VALUE IF NOT EXISTS 'volunteer';
ALTER TYPE resume_section_type ADD VALUE IF NOT EXISTS 'publications';
ALTER TYPE resume_section_type ADD VALUE IF NOT EXISTS 'references';
ALTER TYPE resume_section_type ADD VALUE IF NOT EXISTS 'interests';
ALTER TYPE resume_section_type ADD VALUE IF NOT EXISTS 'awards';
ALTER TYPE resume_section_type ADD VALUE IF NOT EXISTS 'courses';

-- 2. Extend resume_drafts with template, job description, and archive flag
ALTER TABLE resume_drafts
  ADD COLUMN IF NOT EXISTS template          TEXT    NOT NULL DEFAULT 'modern',
  ADD COLUMN IF NOT EXISTS job_description_text TEXT,
  ADD COLUMN IF NOT EXISTS archived          BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Version snapshot table (point-in-time content restore)
CREATE TABLE IF NOT EXISTS resume_draft_versions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id         UUID        NOT NULL REFERENCES resume_drafts(id) ON DELETE CASCADE,
  candidate_id     UUID        NOT NULL REFERENCES candidates(id)    ON DELETE CASCADE,
  label            TEXT,
  sections_snapshot JSONB      NOT NULL DEFAULT '[]',
  template         TEXT        NOT NULL DEFAULT 'modern',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE resume_draft_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'resume_draft_versions' AND policyname = 'rdv_owner_only'
  ) THEN
    CREATE POLICY "rdv_owner_only" ON resume_draft_versions
      FOR ALL USING (candidate_id = auth.uid() OR is_staff());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS resume_draft_versions_draft_created
  ON resume_draft_versions(draft_id, created_at DESC);
