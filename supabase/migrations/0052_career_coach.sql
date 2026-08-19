-- Phase 2A: AI Career Coach foundation
-- Additive migration — no existing tables modified, no DROP TABLE statements.

-- ════════════════════════════════════════════════════════════════
-- 1. career_goals — persistent career direction per candidate
-- ════════════════════════════════════════════════════════════════
CREATE TABLE career_goals (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  target_role  text        NOT NULL,
  "current_role" text,
  target_date  date,
  status       text        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','paused','completed','abandoned')),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_goals_user        ON career_goals (user_id);
CREATE INDEX idx_career_goals_user_status ON career_goals (user_id, status);

-- ════════════════════════════════════════════════════════════════
-- 2. career_assessments — AI-generated career assessment snapshots
-- ════════════════════════════════════════════════════════════════
CREATE TABLE career_assessments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id          uuid        REFERENCES career_goals(id) ON DELETE SET NULL,
  strengths        text[]      NOT NULL DEFAULT '{}',
  weaknesses       text[]      NOT NULL DEFAULT '{}',
  opportunities    text[]      NOT NULL DEFAULT '{}',
  skill_gaps       jsonb       NOT NULL DEFAULT '[]',
  experience_gaps  jsonb       NOT NULL DEFAULT '[]',
  leadership_gaps  jsonb       NOT NULL DEFAULT '[]',
  suggested_roles  text[]      NOT NULL DEFAULT '{}',
  raw_data         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_assessments_user    ON career_assessments (user_id, created_at DESC);
CREATE INDEX idx_career_assessments_goal    ON career_assessments (goal_id);

-- ════════════════════════════════════════════════════════════════
-- 3. career_roadmaps — AI-generated phased roadmap per goal
--    One roadmap per goal (unique index allows upsert-on-conflict).
-- ════════════════════════════════════════════════════════════════
CREATE TABLE career_roadmaps (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id      uuid        NOT NULL REFERENCES career_goals(id) ON DELETE CASCADE,
  phases       jsonb       NOT NULL DEFAULT '[]',
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_roadmaps_goal ON career_roadmaps (goal_id);
CREATE UNIQUE INDEX idx_career_roadmaps_goal_unique ON career_roadmaps (goal_id);

-- ════════════════════════════════════════════════════════════════
-- 4. career_actions — individual actionable items (AI or user-added)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE career_actions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id      uuid        REFERENCES career_goals(id) ON DELETE CASCADE,
  roadmap_id   uuid        REFERENCES career_roadmaps(id) ON DELETE SET NULL,
  title        text        NOT NULL,
  description  text,
  action_type  text        NOT NULL DEFAULT 'other'
                             CHECK (action_type IN (
                               'course','cv_update','linkedin','apply',
                               'interview_practice','skill','networking',
                               'experience','certification','other'
                             )),
  status       text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','in_progress','completed','skipped')),
  due_date     date,
  week_number  integer,
  completed_at timestamptz,
  source       text        NOT NULL DEFAULT 'ai'
                             CHECK (source IN ('ai','user')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_actions_user        ON career_actions (user_id);
CREATE INDEX idx_career_actions_goal        ON career_actions (goal_id);
CREATE INDEX idx_career_actions_user_status ON career_actions (user_id, status);
CREATE INDEX idx_career_actions_goal_week   ON career_actions (goal_id, week_number);

-- ════════════════════════════════════════════════════════════════
-- 5. career_checkins — periodic accountability check-ins
-- ════════════════════════════════════════════════════════════════
CREATE TABLE career_checkins (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id        uuid        NOT NULL REFERENCES career_goals(id) ON DELETE CASCADE,
  accomplished   text,
  blockers       text,
  changes        text,
  support_needed text,
  mood           text        NOT NULL DEFAULT 'neutral'
                               CHECK (mood IN ('great','good','neutral','struggling','off_track')),
  ai_response    jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_checkins_user ON career_checkins (user_id, created_at DESC);
CREATE INDEX idx_career_checkins_goal ON career_checkins (goal_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════
-- 6. career_progress_snapshots — historical progress records
-- ════════════════════════════════════════════════════════════════
CREATE TABLE career_progress_snapshots (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id           uuid        NOT NULL REFERENCES career_goals(id) ON DELETE CASCADE,
  score             integer     NOT NULL CHECK (score BETWEEN 0 AND 100),
  actions_completed integer     NOT NULL DEFAULT 0,
  actions_total     integer     NOT NULL DEFAULT 0,
  checkin_count     integer     NOT NULL DEFAULT 0,
  has_assessment    boolean     NOT NULL DEFAULT false,
  has_roadmap       boolean     NOT NULL DEFAULT false,
  breakdown         jsonb       NOT NULL DEFAULT '{}',
  snapshot_date     date        NOT NULL DEFAULT CURRENT_DATE,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_progress_user_goal ON career_progress_snapshots (user_id, goal_id);
CREATE INDEX idx_career_progress_goal_date ON career_progress_snapshots (goal_id, snapshot_date DESC);

-- ════════════════════════════════════════════════════════════════
-- 7. Row-Level Security — all tables owner-only
-- ════════════════════════════════════════════════════════════════
ALTER TABLE career_goals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_assessments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_roadmaps          ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_checkins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- career_goals
CREATE POLICY "career_goals_select" ON career_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "career_goals_insert" ON career_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "career_goals_update" ON career_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "career_goals_delete" ON career_goals FOR DELETE USING (auth.uid() = user_id);

-- career_assessments
CREATE POLICY "career_assessments_select" ON career_assessments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "career_assessments_insert" ON career_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No UPDATE/DELETE — assessments are append-only audit records

-- career_roadmaps
CREATE POLICY "career_roadmaps_select" ON career_roadmaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "career_roadmaps_insert" ON career_roadmaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "career_roadmaps_update" ON career_roadmaps FOR UPDATE USING (auth.uid() = user_id);

-- career_actions
CREATE POLICY "career_actions_select" ON career_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "career_actions_insert" ON career_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "career_actions_update" ON career_actions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "career_actions_delete" ON career_actions FOR DELETE USING (auth.uid() = user_id);

-- career_checkins
CREATE POLICY "career_checkins_select" ON career_checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "career_checkins_insert" ON career_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No UPDATE/DELETE — check-ins are append-only; ai_response patched via UPDATE below
CREATE POLICY "career_checkins_update" ON career_checkins FOR UPDATE USING (auth.uid() = user_id);

-- career_progress_snapshots
CREATE POLICY "career_progress_select" ON career_progress_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "career_progress_insert" ON career_progress_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
-- 8. updated_at triggers
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_career_goals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_career_goals_updated_at
  BEFORE UPDATE ON career_goals
  FOR EACH ROW EXECUTE FUNCTION update_career_goals_updated_at();

CREATE OR REPLACE FUNCTION update_career_roadmaps_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_career_roadmaps_updated_at
  BEFORE UPDATE ON career_roadmaps
  FOR EACH ROW EXECUTE FUNCTION update_career_roadmaps_updated_at();

CREATE OR REPLACE FUNCTION update_career_actions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_career_actions_updated_at
  BEFORE UPDATE ON career_actions
  FOR EACH ROW EXECUTE FUNCTION update_career_actions_updated_at();
