-- AI Career Workspace
-- Provides per-user persistent storage for the Global AI Workspace:
-- resume context shared across all tools, plus saved outputs from each tool.

-- ============================================================
-- 1. Workspace Resumes — one row per user, upserted on upload
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_workspace_resumes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     text,
  raw_text      text NOT NULL,
  parsed_json   jsonb,                    -- NULL until AI parse completes
  source        text NOT NULL DEFAULT 'paste' CHECK (source IN ('paste', 'upload')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)                        -- one active context per user; replace via upsert
);

-- ============================================================
-- 2. Cover Letter Projects — many per user
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_cover_letters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Untitled Cover Letter',
  company_name    text,
  position        text,
  hiring_manager  text,
  tone            text CHECK (tone IN ('professional', 'enthusiastic', 'executive', 'conversational')),
  length          text CHECK (length IN ('short', 'medium', 'long')),
  job_description text,
  result_json     jsonb NOT NULL,         -- stores the CoverLetterResult structure
  is_favorite     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Interview Prep Sessions — many per user
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_interview_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Untitled Session',
  position         text,
  company          text,
  experience_level text,
  job_description  text,
  result_json      jsonb NOT NULL,        -- stores the GuestInterviewResult structure
  is_favorite      boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Career Reports — many per user
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_career_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'Career Report',
  current_role text,
  target_role  text,
  result_json  jsonb NOT NULL,            -- stores the GuestCareerResult structure
  is_favorite  boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ai_cover_letters_user_id     ON ai_cover_letters (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interview_sessions_user_id ON ai_interview_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_career_reports_user_id    ON ai_career_reports (user_id, created_at DESC);

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE ai_workspace_resumes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cover_letters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interview_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_career_reports       ENABLE ROW LEVEL SECURITY;

-- Workspace resumes: own row only
CREATE POLICY "workspace_resumes_select" ON ai_workspace_resumes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workspace_resumes_insert" ON ai_workspace_resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workspace_resumes_update" ON ai_workspace_resumes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "workspace_resumes_delete" ON ai_workspace_resumes
  FOR DELETE USING (auth.uid() = user_id);

-- Cover letters: own rows only
CREATE POLICY "cover_letters_select" ON ai_cover_letters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cover_letters_insert" ON ai_cover_letters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cover_letters_update" ON ai_cover_letters
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cover_letters_delete" ON ai_cover_letters
  FOR DELETE USING (auth.uid() = user_id);

-- Interview sessions: own rows only
CREATE POLICY "interview_sessions_select" ON ai_interview_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "interview_sessions_insert" ON ai_interview_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "interview_sessions_update" ON ai_interview_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "interview_sessions_delete" ON ai_interview_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Career reports: own rows only
CREATE POLICY "career_reports_select" ON ai_career_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "career_reports_insert" ON ai_career_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "career_reports_update" ON ai_career_reports
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "career_reports_delete" ON ai_career_reports
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_ai_workspace_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_ai_workspace_resumes_updated_at
  BEFORE UPDATE ON ai_workspace_resumes
  FOR EACH ROW EXECUTE FUNCTION update_ai_workspace_updated_at();

CREATE TRIGGER trg_ai_cover_letters_updated_at
  BEFORE UPDATE ON ai_cover_letters
  FOR EACH ROW EXECUTE FUNCTION update_ai_workspace_updated_at();

CREATE TRIGGER trg_ai_interview_sessions_updated_at
  BEFORE UPDATE ON ai_interview_sessions
  FOR EACH ROW EXECUTE FUNCTION update_ai_workspace_updated_at();

CREATE TRIGGER trg_ai_career_reports_updated_at
  BEFORE UPDATE ON ai_career_reports
  FOR EACH ROW EXECUTE FUNCTION update_ai_workspace_updated_at();
