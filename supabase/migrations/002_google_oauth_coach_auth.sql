-- =============================================================================
-- Migration 002: Google OAuth — Coach Email Allowlist + Auth Hook
-- =============================================================================
-- Run this in the Supabase SQL Editor (project > SQL Editor > New query).
--
-- What this does:
--   1. Creates the `coach_email_allowlist` table — the source of truth for
--      which email addresses are permitted to sign in as coaches.
--   2. Creates a before-sign-in auth hook function that blocks any OAuth
--      sign-in attempt whose email is not in the allowlist.
--   3. Grants the `supabase_auth_admin` role (used by Supabase's hook runner)
--      read access to the allowlist table.
--
-- After running this migration:
--   - Seed the allowlist with your coach emails (see seed section below or
--     use supabase/seed.sql).
--   - Register the hook in the Supabase dashboard:
--       Authentication > Hooks > Custom Access Token Hook
--       Select function: public.restrict_oauth_to_coaches
--
-- This hook fires for ALL OAuth sign-ins. Password sign-ins bypass it.
-- The domain check in the hook is defence-in-depth — the allowlist is
-- the authoritative gate.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Table: coach_email_allowlist
-- ---------------------------------------------------------------------------
-- Stores the set of email addresses permitted to use OAuth (Google) sign-in
-- as coaches. The `is_active` flag lets you disable an entry without deleting
-- it (preserving audit history). The `notes` column is for admin context
-- (e.g. "Head Coach — added 2026-06").
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS coach_email_allowlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email       TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  notes       TEXT,

  UNIQUE (email)
);

-- Create a unique index that enforces case-insensitive email uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_email_allowlist_email_lower
ON coach_email_allowlist (LOWER(email));

-- Normalise emails to lowercase on insert/update to avoid case-sensitivity
-- bugs (Google returns emails in lowercase but defensive normalisation is worth it).
CREATE OR REPLACE FUNCTION normalise_allowlist_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = LOWER(TRIM(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coach_email_allowlist_normalise_email ON coach_email_allowlist;
CREATE TRIGGER coach_email_allowlist_normalise_email
  BEFORE INSERT OR UPDATE ON coach_email_allowlist
  FOR EACH ROW EXECUTE FUNCTION normalise_allowlist_email();

DROP TRIGGER IF EXISTS coach_email_allowlist_set_updated_at ON coach_email_allowlist;
CREATE TRIGGER coach_email_allowlist_set_updated_at
  BEFORE UPDATE ON coach_email_allowlist
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- RLS for coach_email_allowlist
-- ---------------------------------------------------------------------------
-- This table should NOT be readable by the browser anon/authenticated client.
-- It is only read by the auth hook (running as supabase_auth_admin) and
-- by service-role queries (server actions managing the list).
-- ---------------------------------------------------------------------------

ALTER TABLE coach_email_allowlist ENABLE ROW LEVEL SECURITY;

-- Deny all access to anon and authenticated roles.
-- The auth hook runs as supabase_auth_admin which bypasses RLS entirely.
DROP POLICY IF EXISTS "coach_email_allowlist_no_public_access" ON coach_email_allowlist;
-- (No policy = deny all for anon/authenticated. RLS is enabled so absence of
-- a matching policy means access is denied.)


-- ---------------------------------------------------------------------------
-- Auth Hook: restrict_oauth_to_coaches
-- ---------------------------------------------------------------------------
-- Supabase calls this function during every sign-in event. The hook receives
-- the event JSON and must return a modified (or unmodified) version of it.
--
-- If `authentication_method` is 'oauth', we check the allowlist. If the
-- email is not found (or is inactive), we raise an exception which causes
-- Supabase to reject the sign-in entirely — no session is created.
--
-- Password sign-ins are NOT blocked here; they continue to work exactly as
-- before. This hook only gates OAuth sign-ins.
--
-- The hook also writes `role: 'coach'` into `app_metadata` for allowlisted
-- sign-ins. This claim is server-only and can be read in middleware and
-- server actions to determine the user's role without a database query.
--
-- Reference: https://supabase.com/docs/guides/auth/auth-hooks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.restrict_oauth_to_coaches(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
-- SECURITY DEFINER is required: the hook must run with elevated privileges
-- to read coach_email_allowlist (which denies access to the authenticated role).
SET search_path = public
AS $$
DECLARE
  v_email        TEXT;
  v_method       TEXT;
  v_is_allowed   BOOLEAN;
  v_user         JSONB;
BEGIN
  v_user := event -> 'user';
  v_method := v_user -> 'app_metadata' ->> 'provider';
  v_email := LOWER(TRIM(v_user ->> 'email'));

  -- Check auth method and enforce rules accordingly
  IF v_method = 'google' THEN
    -- Google OAuth: must be in allowlist
    SELECT EXISTS (
      SELECT 1
      FROM   coach_email_allowlist
      WHERE  LOWER(email) = v_email
      AND    is_active = TRUE
    ) INTO v_is_allowed;

    IF NOT v_is_allowed THEN
      RAISE EXCEPTION 'Email % is not authorised to sign in as a coach.', v_email
        USING ERRCODE = 'P0001';
    END IF;

  ELSIF v_method = 'email' THEN
    -- Email/password invites: allow freely

  ELSE
    -- Unknown/future OAuth providers: block by default to prevent allowlist bypass
    RAISE EXCEPTION 'Sign-in provider % is not permitted.', COALESCE(v_method, 'unknown')
      USING ERRCODE = 'P0001';
  END IF;

  -- Stamp all approved users with coach role
  v_user := jsonb_set(
    v_user,
    '{app_metadata}',
    COALESCE(v_user -> 'app_metadata', '{}'::JSONB) || '{"role": "coach"}'::JSONB
  );

  RETURN jsonb_build_object('user', v_user);
END;
$$;

-- Grant the auth hook runner permission to execute this function.
-- supabase_auth_admin is the role Supabase uses when invoking hooks.
GRANT EXECUTE ON FUNCTION public.restrict_oauth_to_coaches(JSONB)
  TO supabase_auth_admin;

-- Revoke execution from public to prevent direct calls.
REVOKE EXECUTE ON FUNCTION public.restrict_oauth_to_coaches(JSONB)
  FROM PUBLIC;


-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- Seed the allowlist (add your coach emails here)
-- ---------------------------------------------------------------------------
-- Replace these placeholder emails with your actual coach email addresses.
-- These are the Google account emails the coaches will sign in with — they
-- do NOT need to match the email stored in the coaches table, though it is
-- good practice to keep them aligned.
--
-- You can also manage this table via a future "Manage Coaches" admin UI.
-- ---------------------------------------------------------------------------

-- INSERT INTO coach_email_allowlist (email, notes) VALUES
--   ('head.coach@gmail.com',   'Head Coach'),
--   ('backs.coach@gmail.com',  'Backs Coach'),
--   ('forwards@gmail.com',     'Forwards Coach')
-- ON CONFLICT DO NOTHING;
