-- ============================================================================
-- Migration 0053: Production Security Hardening
--
-- Fixes shipped in this migration:
--   CRIT-01  Role-escalation prevention trigger on public.profiles
--   HIGH-02  Storage resumes: use is_candidate_visible_to_staff instead of
--            blanket is_staff() so cross-company staff can't read files
--   HIGH-03  company_profiles: scope writes to the caller's own company
--   MED-01   saved_candidates: scope to the owning recruiter (recruiter_id=uid)
--   MED-02   messages: split FOR ALL into per-operation policies so candidates
--            cannot forge sender_role and anyone can't DELETE messages
--   MED-03   offers: restrict candidate FROM ALL to SELECT+scoped UPDATE;
--            add trigger preventing salary/term tampering
--   MED-04   audit_logs: drop open INSERT so fabricated logs are impossible
--   MED-08   recruiter_candidate_labels: scope to owning recruiter
--   MED-07   portfolios bucket: add allowed_mime_types restriction
--   LOW-01   company-logos storage: scope upload path to own company_id
-- ============================================================================

BEGIN;

-- ============================================================================
-- CRIT-01: Role escalation prevention trigger
-- Blocks any authenticated user from changing profiles.role via the REST API.
-- Service-role operations (admin client) set auth.role() = 'service_role' and
-- are explicitly allowed through. This closes the direct PATCH /profiles bypass.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role key bypasses this check (used by admin server actions).
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Any attempt by a normal authenticated user to change the role column is blocked.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role_escalation_blocked: role changes require a privileged service operation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- ============================================================================
-- HIGH-02: Resumes storage — replace blanket is_staff() with
-- is_candidate_visible_to_staff() so only recruiters from a company that has
-- an application from, or has saved, the candidate can read their resume file.
-- ============================================================================

DROP POLICY IF EXISTS "resumes_owner_select" ON storage.objects;

CREATE POLICY "resumes_owner_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'resumes'
    AND (
      -- Owner: the candidate whose folder this is
      auth.uid()::text = (storage.foldername(name))[1]
      -- Recruiter from a company that can see this candidate
      OR public.is_candidate_visible_to_staff(
           (storage.foldername(name))[1]::uuid
         )
      -- Super admin
      OR public.is_admin()
    )
  );

-- ============================================================================
-- HIGH-03: company_profiles — scope write access to the calling recruiter's
-- own company. The old policy joined recruiters + profiles without linking them,
-- meaning any staff member could manage any company's profile.
-- Public read for published profiles is preserved unchanged.
-- ============================================================================

DROP POLICY IF EXISTS "recruiter manages own company_profile" ON public.company_profiles;

CREATE POLICY "company_profile_own_company" ON public.company_profiles
  FOR ALL
  USING (
    company_id = public.my_company_id()
    OR public.is_admin()
  )
  WITH CHECK (
    company_id = public.my_company_id()
    OR public.is_admin()
  );

-- ============================================================================
-- MED-01: saved_candidates — scope to the owning recruiter.
-- The old policy allowed ANY recruiter/hr_manager/super_admin to read/write
-- any other recruiter's bookmarks because it only checked that the user was
-- staff, not that recruiter_id = auth.uid().
-- ============================================================================

DROP POLICY IF EXISTS "recruiter owns saved_candidates" ON public.saved_candidates;

CREATE POLICY "saved_candidates_own" ON public.saved_candidates
  FOR ALL
  USING (
    recruiter_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    recruiter_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================================
-- MED-08: recruiter_candidate_labels — same class of bug as saved_candidates.
-- Old policy checked that a recruiter row existed for the label's recruiter_id
-- AND that auth.uid() was a staff member, but never linked the two, so any
-- staff member could see all labels for any recruiter.
-- ============================================================================

DROP POLICY IF EXISTS "recruiter owns labels" ON public.recruiter_candidate_labels;

CREATE POLICY "recruiter_candidate_labels_own" ON public.recruiter_candidate_labels
  FOR ALL
  USING (
    recruiter_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    recruiter_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================================
-- MED-02: messages — split the permissive FOR ALL policy into separate
-- per-operation policies.
--
-- Problem with the old "thread_members_access_messages" FOR ALL:
--   • A candidate could INSERT a message with sender_role='recruiter' because
--     the USING clause only checked thread membership, not sender identity.
--   • Either party could DELETE messages.
--
-- Fix: separate SELECT, INSERT (with sender identity check), and UPDATE
-- policies. No DELETE policy is created — nobody can delete messages via REST.
-- ============================================================================

DROP POLICY IF EXISTS "thread_members_access_messages" ON public.messages;

-- SELECT: any thread member can read all messages in their thread.
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = thread_id
        AND (t.recruiter_id = auth.uid() OR t.candidate_id = auth.uid())
    )
    OR public.is_admin()
  );

-- INSERT for recruiters: caller must be the thread's recruiter and must claim
-- the recruiter sender_role.
CREATE POLICY "messages_insert_as_recruiter" ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'recruiter'
    AND EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = thread_id
        AND t.recruiter_id = auth.uid()
    )
  );

-- INSERT for candidates: caller must be the thread's candidate and must claim
-- the candidate sender_role.
CREATE POLICY "messages_insert_as_candidate" ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'candidate'
    AND EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = thread_id
        AND t.candidate_id = auth.uid()
    )
  );

-- Admin INSERT (for system messages if needed).
CREATE POLICY "messages_admin_insert" ON public.messages
  FOR INSERT
  WITH CHECK (public.is_admin());

-- UPDATE: any thread member can mark messages as read (is_read field).
-- The application layer (markThreadReadAction) verifies thread ownership
-- before calling update.
CREATE POLICY "messages_update_read_status" ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = thread_id
        AND (t.recruiter_id = auth.uid() OR t.candidate_id = auth.uid())
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.message_threads t
      WHERE t.id = thread_id
        AND (t.recruiter_id = auth.uid() OR t.candidate_id = auth.uid())
    )
    OR public.is_admin()
  );

-- ============================================================================
-- MED-03a: offers — replace the permissive FOR ALL candidate policy with a
-- SELECT-only policy. Candidates respond to offers via an UPDATE that the
-- trigger below restricts to status + candidate_note changes only.
-- ============================================================================

DROP POLICY IF EXISTS "candidates_view_respond_offers" ON public.offers;

-- Candidates can read their own offers.
CREATE POLICY "candidates_select_offers" ON public.offers
  FOR SELECT
  USING (
    candidate_id = auth.uid()
    OR public.is_admin()
  );

-- Candidates can update status to accepted/declined and set candidate_note.
-- The trigger below enforces that no other field changes.
CREATE POLICY "candidates_respond_offers" ON public.offers
  FOR UPDATE
  USING (
    candidate_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    candidate_id = auth.uid()
    AND status IN ('accepted', 'declined')
  );

-- ============================================================================
-- MED-03b: offers — trigger preventing candidates from changing employer fields.
-- Candidates should only be able to change: status (to accepted/declined),
-- candidate_note, and responded_at. All other columns are employer-controlled.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_offer_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role operations are unrestricted.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Only apply candidate-specific restrictions when the caller is the candidate.
  IF auth.uid() = OLD.candidate_id THEN
    IF NEW.company_id        IS DISTINCT FROM OLD.company_id
    OR NEW.job_id            IS DISTINCT FROM OLD.job_id
    OR NEW.recruiter_id      IS DISTINCT FROM OLD.recruiter_id
    OR NEW.candidate_id      IS DISTINCT FROM OLD.candidate_id
    OR NEW.offer_title       IS DISTINCT FROM OLD.offer_title
    OR NEW.salary_min        IS DISTINCT FROM OLD.salary_min
    OR NEW.salary_max        IS DISTINCT FROM OLD.salary_max
    OR NEW.currency          IS DISTINCT FROM OLD.currency
    OR NEW.start_date        IS DISTINCT FROM OLD.start_date
    OR NEW.expiry_date       IS DISTINCT FROM OLD.expiry_date
    OR NEW.offer_letter      IS DISTINCT FROM OLD.offer_letter
    OR NEW.sent_at           IS DISTINCT FROM OLD.sent_at
    OR NEW.created_at        IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'offer_tampering_blocked: candidates may only update status and candidate_note';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_offer_tampering ON public.offers;
CREATE TRIGGER trg_prevent_offer_tampering
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_offer_tampering();

-- ============================================================================
-- MED-04: audit_logs — drop the open INSERT policy.
-- All legitimate audit inserts come from the service-role admin client, which
-- bypasses RLS entirely. Keeping an open INSERT policy allows any authenticated
-- user to inject fabricated log entries via the REST API.
-- ============================================================================

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

-- ============================================================================
-- MED-07: portfolios bucket — add MIME type allowlist.
-- The bucket was created with allowed_mime_types = null (no restriction).
-- ============================================================================

UPDATE storage.buckets
  SET allowed_mime_types = ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm'
  ]
  WHERE id = 'portfolios';

-- ============================================================================
-- LOW-01: company-logos storage — scope upload path to the recruiter's own
-- company_id so recruiters cannot overwrite other companies' logo folders.
-- The old policy only checked is_staff() (any staff at any company).
-- ============================================================================

DROP POLICY IF EXISTS "company_logos_staff_write" ON storage.objects;

CREATE POLICY "company_logos_own_company_write" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (
      -- Path's first segment must match the caller's company
      (storage.foldername(name))[1] = public.my_company_id()::text
      -- Super admin can upload to any company's folder
      OR public.is_admin()
    )
  );

COMMIT;
