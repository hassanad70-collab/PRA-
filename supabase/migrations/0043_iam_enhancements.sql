-- ============================================================================
-- Migration 0043: IAM Enhancements
--
-- Adds account-management columns needed by the Enterprise IAM module:
--   · department           — user's department/team for display & filtering
--   · is_locked            — hard lock (Supabase ban + UI gate)
--   · locked_at            — timestamp when the account was locked
--   · force_password_reset — flag cleared once the user resets their password
--
-- Super-admin bootstrap (Hassan.ad70@gmail.com) was already applied in
-- migration 0030. This migration contains NO email-based logic.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department          text,
  ADD COLUMN IF NOT EXISTS is_locked           boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at           timestamptz,
  ADD COLUMN IF NOT EXISTS force_password_reset boolean    NOT NULL DEFAULT false;

-- Quick lookup for locked accounts used by the IAM admin page
CREATE INDEX IF NOT EXISTS profiles_is_locked_idx
  ON public.profiles (is_locked)
  WHERE is_locked = true;

-- Update handle_new_user so admin-created users inherit all metadata fields
-- (phone and department are now included in user_metadata when the admin
-- creates a user through the IAM panel).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email, avatar_url, phone, department)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'candidate'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'department'
  );
  RETURN NEW;
END;
$$;
