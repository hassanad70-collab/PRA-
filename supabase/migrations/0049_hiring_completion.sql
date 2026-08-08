-- ============================================================================
-- Migration 0049: Hiring Completion — Messaging + Offer Management
-- Track A: Direct messaging between recruiters and candidates
-- Track B: Formal offer lifecycle
-- ============================================================================

-- ---------------------------------------------------------------------------
-- message_threads: one thread per recruiter × candidate pair
-- ---------------------------------------------------------------------------
CREATE TABLE public.message_threads (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID        NOT NULL REFERENCES public.companies(id)   ON DELETE CASCADE,
  recruiter_id           UUID        NOT NULL REFERENCES public.recruiters(id)  ON DELETE CASCADE,
  candidate_id           UUID        NOT NULL REFERENCES public.candidates(id)  ON DELETE CASCADE,
  job_id                 UUID        REFERENCES public.jobs(id)                 ON DELETE SET NULL,
  subject                TEXT,
  last_message_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  recruiter_unread_count INT         NOT NULL DEFAULT 0,
  candidate_unread_count INT         NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recruiter_id, candidate_id)
);

CREATE INDEX message_threads_recruiter_idx  ON public.message_threads (recruiter_id, last_message_at DESC);
CREATE INDEX message_threads_candidate_idx  ON public.message_threads (candidate_id, last_message_at DESC);
CREATE INDEX message_threads_company_idx    ON public.message_threads (company_id);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recruiters_own_threads"
  ON public.message_threads FOR ALL
  USING (recruiter_id = auth.uid());

CREATE POLICY "candidates_view_their_threads"
  ON public.message_threads FOR SELECT
  USING (candidate_id = auth.uid());

-- ---------------------------------------------------------------------------
-- messages: individual messages in a thread
-- ---------------------------------------------------------------------------
CREATE TABLE public.messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    UUID        NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_role  TEXT        NOT NULL CHECK (sender_role IN ('recruiter', 'candidate')),
  sender_id    UUID        NOT NULL,  -- recruiter.id or candidate.id (= auth.uid())
  body         TEXT        NOT NULL CHECK (char_length(body) > 0),
  is_read      BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_thread_idx ON public.messages (thread_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thread_members_access_messages"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = thread_id
        AND (t.recruiter_id = auth.uid() OR t.candidate_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- offer_templates: reusable letter templates per company
-- ---------------------------------------------------------------------------
CREATE TABLE public.offer_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_recruiters_manage_templates"
  ON public.offer_templates FOR ALL
  USING (company_id = public.my_company_id());

-- ---------------------------------------------------------------------------
-- offers: formal job offer sent from recruiter to candidate
-- ---------------------------------------------------------------------------
CREATE TABLE public.offers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        NOT NULL REFERENCES public.companies(id)    ON DELETE CASCADE,
  job_id          UUID        NOT NULL REFERENCES public.jobs(id)          ON DELETE CASCADE,
  candidate_id    UUID        NOT NULL REFERENCES public.candidates(id)    ON DELETE CASCADE,
  recruiter_id    UUID        NOT NULL REFERENCES public.recruiters(id)    ON DELETE CASCADE,
  offer_title     TEXT        NOT NULL,
  salary_min      INTEGER,
  salary_max      INTEGER,
  currency        TEXT        NOT NULL DEFAULT 'USD',
  start_date      DATE,
  expiry_date     DATE,
  offer_letter    TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','declined','expired','withdrawn')),
  candidate_note  TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);

CREATE INDEX offers_candidate_idx ON public.offers (candidate_id, status);
CREATE INDEX offers_company_idx   ON public.offers (company_id, status);
CREATE INDEX offers_job_idx       ON public.offers (job_id);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_recruiters_manage_offers"
  ON public.offers FOR ALL
  USING (company_id = public.my_company_id());

CREATE POLICY "candidates_view_respond_offers"
  ON public.offers FOR ALL
  USING (candidate_id = auth.uid());
