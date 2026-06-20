-- =============================================================================
-- Caerphilly Rugby Tracker — Database Schema
-- =============================================================================
-- Run this in the Supabase SQL Editor (project > SQL Editor > New query).
-- This script is idempotent: safe to run multiple times.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- UUID generation (available by default in Supabase, but explicit is clear)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE player_position AS ENUM (
    'Loosehead Prop',
    'Hooker',
    'Tighthead Prop',
    'Lock',
    'Blindside Flanker',
    'Openside Flanker',
    'Number 8',
    'Scrum Half',
    'Fly Half',
    'Left Wing',
    'Inside Centre',
    'Outside Centre',
    'Right Wing',
    'Fullback'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE player_status AS ENUM (
    'active',
    'inactive',
    'injured',
    'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coach_role AS ENUM (
    'Head Coach',
    'Assistant Coach',
    'Forwards Coach',
    'Backs Coach',
    'Strength & Conditioning',
    'Team Manager'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'training',
    'match',
    'meeting',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'injured',
    'excused'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- Helper function: auto-update updated_at timestamp
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Table: players
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS players (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_name      TEXT NOT NULL CHECK (char_length(first_name) > 0),
  last_name       TEXT NOT NULL CHECK (char_length(last_name) > 0),
  date_of_birth   DATE,
  email           TEXT,
  phone           TEXT,
  position        player_position,
  squad_number    SMALLINT CHECK (squad_number > 0 AND squad_number <= 99),
  status          player_status NOT NULL DEFAULT 'active',
  notes           TEXT
);

-- Unique constraint: squad number must be unique among active players.
-- We allow NULL (unassigned) and duplicates for non-active players.
CREATE UNIQUE INDEX IF NOT EXISTS players_squad_number_active_unique
  ON players (squad_number)
  WHERE status = 'active' AND squad_number IS NOT NULL;

-- Auto-update updated_at on row change.
DROP TRIGGER IF EXISTS players_set_updated_at ON players;
CREATE TRIGGER players_set_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- Table: coaches
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS coaches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_name  TEXT NOT NULL CHECK (char_length(first_name) > 0),
  last_name   TEXT NOT NULL CHECK (char_length(last_name) > 0),
  email       TEXT,
  phone       TEXT,
  role        coach_role NOT NULL,
  notes       TEXT
);

DROP TRIGGER IF EXISTS coaches_set_updated_at ON coaches;
CREATE TRIGGER coaches_set_updated_at
  BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- Table: events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title         TEXT NOT NULL CHECK (char_length(title) > 0),
  event_type    event_type NOT NULL DEFAULT 'training',
  event_date    TIMESTAMPTZ NOT NULL,
  location      TEXT,
  notes         TEXT,
  is_cancelled  BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index for efficient date-range queries (e.g. upcoming events).
CREATE INDEX IF NOT EXISTS events_event_date_idx ON events (event_date);

DROP TRIGGER IF EXISTS events_set_updated_at ON events;
CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- Table: attendance
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id    UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  player_id   UUID REFERENCES players (id) ON DELETE CASCADE,
  coach_id    UUID REFERENCES coaches (id) ON DELETE CASCADE,
  status      attendance_status NOT NULL DEFAULT 'absent',
  notes       TEXT,

  -- Each person appears at most once per event.
  CONSTRAINT attendance_unique_player_event
    UNIQUE (event_id, player_id),
  CONSTRAINT attendance_unique_coach_event
    UNIQUE (event_id, coach_id),

  -- Each record must reference exactly one of player or coach, not both or neither.
  CONSTRAINT attendance_person_check
    CHECK (
      (player_id IS NOT NULL AND coach_id IS NULL)
      OR
      (player_id IS NULL AND coach_id IS NOT NULL)
    )
);

-- Indexes for joining attendance to events, players, and coaches.
CREATE INDEX IF NOT EXISTS attendance_event_id_idx    ON attendance (event_id);
CREATE INDEX IF NOT EXISTS attendance_player_id_idx   ON attendance (player_id);
CREATE INDEX IF NOT EXISTS attendance_coach_id_idx    ON attendance (coach_id);

DROP TRIGGER IF EXISTS attendance_set_updated_at ON attendance;
CREATE TRIGGER attendance_set_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------
-- All tables are protected. Only authenticated users (the admin) may read
-- or write data. The anon role has no access.
-- ---------------------------------------------------------------------------

ALTER TABLE players    ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches    ENABLE ROW LEVEL SECURITY;
ALTER TABLE events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Players: authenticated users can do everything.
DROP POLICY IF EXISTS "players_authenticated_all" ON players;
CREATE POLICY "players_authenticated_all"
  ON players
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Coaches: authenticated users can do everything.
DROP POLICY IF EXISTS "coaches_authenticated_all" ON coaches;
CREATE POLICY "coaches_authenticated_all"
  ON coaches
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Events: authenticated users can do everything.
DROP POLICY IF EXISTS "events_authenticated_all" ON events;
CREATE POLICY "events_authenticated_all"
  ON events
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Attendance: authenticated users can do everything.
DROP POLICY IF EXISTS "attendance_authenticated_all" ON attendance;
CREATE POLICY "attendance_authenticated_all"
  ON attendance
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
