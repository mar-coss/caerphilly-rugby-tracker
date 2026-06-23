-- =============================================================================
-- Migration 001: Team Lineups
-- =============================================================================
-- Adds the team_lineups table used by the Team Planner feature.
-- Safe to run multiple times (idempotent via IF NOT EXISTS / DROP IF EXISTS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: team_lineups
-- ---------------------------------------------------------------------------
-- Stores one row per team per event. The `lineups` JSONB column holds an
-- ordered array of { position: 1–10, player_id: UUID } objects — one entry
-- per pitch position. We store this as JSONB rather than a child table because:
--   • The 10-slot array is always a bounded, small structure.
--   • Reads/writes always touch the entire lineup atomically.
--   • No cross-lineup querying on individual positions is needed.
-- The UNIQUE constraint on (event_id, team_number) ensures each team number
-- is used at most once per event, enabling clean upserts.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS team_lineups (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_id      UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  team_number   SMALLINT    NOT NULL CHECK (team_number >= 1 AND team_number <= 10),
  lineups       JSONB       NOT NULL DEFAULT '[]'::jsonb,

  CONSTRAINT team_lineups_unique_event_team
    UNIQUE (event_id, team_number)
);

-- Index for the most common access pattern: fetch all lineups for an event.
CREATE INDEX IF NOT EXISTS team_lineups_event_id_idx ON team_lineups (event_id);

-- Auto-update updated_at on row change.
DROP TRIGGER IF EXISTS team_lineups_set_updated_at ON team_lineups;
CREATE TRIGGER team_lineups_set_updated_at
  BEFORE UPDATE ON team_lineups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE team_lineups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_lineups_authenticated_all" ON team_lineups;
CREATE POLICY "team_lineups_authenticated_all"
  ON team_lineups
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);
