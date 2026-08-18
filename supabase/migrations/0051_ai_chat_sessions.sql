-- AI Career Chatbot: persistent chat sessions and messages
-- Additive migration — no existing tables modified.

-- ════════════════════════════════════════════════════════════════
-- 1. Chat Sessions — one row per conversation thread
-- ════════════════════════════════════════════════════════════════
CREATE TABLE ai_chat_sessions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain               text        NOT NULL DEFAULT 'general'
                                   CHECK (domain IN (
                                     'general','resume','ats','cover-letter',
                                     'interview','career','job-search'
                                   )),
  title                text        NOT NULL DEFAULT 'New Chat',
  last_message_preview text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_sessions_user ON ai_chat_sessions (user_id, updated_at DESC);

-- ════════════════════════════════════════════════════════════════
-- 2. Chat Messages — ordered messages within a session
-- ════════════════════════════════════════════════════════════════
CREATE TABLE ai_chat_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_messages_session ON ai_chat_messages (session_id, created_at ASC);
CREATE INDEX idx_ai_chat_messages_user    ON ai_chat_messages (user_id);

-- ════════════════════════════════════════════════════════════════
-- 3. Row-Level Security
-- ════════════════════════════════════════════════════════════════
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_select" ON ai_chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_sessions_insert" ON ai_chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_sessions_update" ON ai_chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "chat_sessions_delete" ON ai_chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Messages: user_id denormalized for direct RLS predicate (no join needed)
CREATE POLICY "chat_messages_select" ON ai_chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chat_messages_insert" ON ai_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No UPDATE/DELETE policies on messages — append-only; deletion via session CASCADE

-- ════════════════════════════════════════════════════════════════
-- 4. updated_at trigger for sessions
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_ai_chat_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_ai_chat_sessions_updated_at
  BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_ai_chat_sessions_updated_at();
