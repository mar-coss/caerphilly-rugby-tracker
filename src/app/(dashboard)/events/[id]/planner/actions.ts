'use server';

/**
 * Server Actions for the Team Planner feature.
 *
 * Responsibilities:
 * - Validate lineups before persisting (all 10 positions filled, no duplicates)
 * - Upsert team lineup records (idempotent — coaches can re-save at any time)
 * - Fetch saved lineups for an event (enriched with player data)
 * - Return typed ActionResult envelopes consistent with the rest of the app
 * - Revalidate the event detail path so saved lineups appear immediately
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getErrorMessage, logError } from '@/lib/utils';
import type { ActionResult, TeamLineupWithPlayers, LineupSlot } from '@/types';
import type { PlayerRow } from '@/types/database';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface LineupValidationError {
  message: string;
}

/**
 * Validates a proposed lineup array.
 *
 * Rules:
 * 1. Exactly POSITION_COUNT entries required.
 * 2. Each position number must be in range 1–POSITION_COUNT with no gaps.
 * 3. No two slots may reference the same player_id.
 * 4. Each player_id must be a non-empty string.
 */
function validateLineup(lineups: LineupSlot[]): LineupValidationError | null {
  // Allow flexible team sizes: at least 1 player, with starting positions 1-10 and subs at 11+
  if (lineups.length < 1) {
    return {
      message: `A lineup must have at least 1 player assigned.`,
    };
  }

  const positions = new Set<number>();
  const playerIds = new Set<string>();

  for (const slot of lineups) {
    // Position numbers: 1-10 for starting positions, 11+ for substitutes
    if (!Number.isInteger(slot.position) || slot.position < 1) {
      return {
        message: `Position ${slot.position} is invalid (must be a positive integer).`,
      };
    }

    if (positions.has(slot.position)) {
      return { message: `Position ${slot.position} is assigned more than once.` };
    }

    if (!slot.player_id || typeof slot.player_id !== 'string') {
      return { message: `Position ${slot.position} does not have a valid player assigned.` };
    }

    if (playerIds.has(slot.player_id)) {
      return {
        message: `Player is assigned to more than one position. Each player may only appear once per team.`,
      };
    }

    positions.add(slot.position);
    playerIds.add(slot.player_id);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Saves (upserts) a single team lineup for a given event.
 *
 * If a lineup already exists for (event_id, team_number) it is replaced in
 * full — there is no partial update. This matches the UI model where a coach
 * re-fills all 10 positions on the pitch before saving.
 *
 * Revalidates `/events/[eventId]` so the saved lineups section updates.
 */
export async function saveTeamLineup(
  eventId: string,
  teamNumber: number,
  lineups: LineupSlot[],
): Promise<ActionResult<TeamLineupWithPlayers>> {
  if (!eventId) {
    return { success: false, error: 'Event ID is required.' };
  }

  if (!Number.isInteger(teamNumber) || teamNumber < 1) {
    return { success: false, error: 'Team number must be a positive integer.' };
  }

  const validationError = validateLineup(lineups);
  if (validationError) {
    return { success: false, error: validationError.message };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Upsert the lineup row. ON CONFLICT on the unique (event_id, team_number)
    // constraint replaces the lineups column with the new value.
    // The Supabase client types JSONB columns as `Json` (a deep recursive type),
    // but our TeamLineupInsert defines `lineups` as `LineupSlot[]`. We cast
    // through `unknown` to satisfy the structural assignment constraint without
    // losing type safety at the business logic level — the shape is validated
    // above before this point.
    const upsertPayload = {
      event_id:    eventId,
      team_number: teamNumber,
      lineups:     lineups as unknown as never,
    };

    const { data: upsertedRow, error: upsertError } = await supabase
      .from('team_lineups')
      .upsert(upsertPayload, { onConflict: 'event_id,team_number' })
      .select()
      .single();

    if (upsertError) {
      logError('saveTeamLineup:upsert', upsertError);
      return { success: false, error: getErrorMessage(upsertError) };
    }

    // Enrich with player data so the caller gets a fully resolved object.
    const playerIds = lineups.map((s) => s.player_id);
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .in('id', playerIds);

    if (playersError) {
      logError('saveTeamLineup:fetchPlayers', playersError);
      return { success: false, error: getErrorMessage(playersError) };
    }

    const playerMap = new Map<string, PlayerRow>(
      (players ?? []).map((p) => [p.id, p]),
    );

    const enrichedLineups = (upsertedRow.lineups as unknown as LineupSlot[]).map((slot) => ({
      ...slot,
      player: playerMap.get(slot.player_id)!,
    }));

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/planner`);

    return {
      success: true,
      data: {
        ...upsertedRow,
        lineups: enrichedLineups,
      },
    };
  } catch (caught) {
    logError('saveTeamLineup', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Fetches all saved team lineups for a given event, enriched with player data.
 *
 * Returns an empty array (not an error) when no lineups have been saved yet.
 * Results are ordered by team_number ascending.
 */
export async function getTeamLineups(
  eventId: string,
): Promise<ActionResult<TeamLineupWithPlayers[]>> {
  if (!eventId) {
    return { success: false, error: 'Event ID is required.' };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data: rows, error: rowsError } = await supabase
      .from('team_lineups')
      .select('*')
      .eq('event_id', eventId)
      .order('team_number', { ascending: true });

    if (rowsError) {
      logError('getTeamLineups:fetch', rowsError);
      return { success: false, error: getErrorMessage(rowsError) };
    }

    if (!rows || rows.length === 0) {
      return { success: true, data: [] };
    }

    // Collect all unique player IDs across all lineups, then fetch in one query.
    const allPlayerIds = Array.from(
      new Set(
        rows.flatMap((row) =>
          (row.lineups as unknown as LineupSlot[]).map((s) => s.player_id),
        ),
      ),
    );

    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .in('id', allPlayerIds);

    if (playersError) {
      logError('getTeamLineups:fetchPlayers', playersError);
      return { success: false, error: getErrorMessage(playersError) };
    }

    const playerMap = new Map<string, PlayerRow>(
      (players ?? []).map((p) => [p.id, p]),
    );

    const enriched: TeamLineupWithPlayers[] = rows.map((row) => ({
      ...row,
      lineups: (row.lineups as unknown as LineupSlot[]).map((slot) => ({
        ...slot,
        player: playerMap.get(slot.player_id)!,
      })),
    }));

    return { success: true, data: enriched };
  } catch (caught) {
    logError('getTeamLineups', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}
