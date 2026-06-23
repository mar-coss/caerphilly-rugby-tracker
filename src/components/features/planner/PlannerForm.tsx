'use client';

/**
 * PlannerForm
 *
 * Multi-step wizard for creating and editing match day team lineups.
 *
 * Step 1 — Team count selection
 *   Coach picks how many teams to plan. The maximum is derived from
 *   Math.floor(activePlayers.length / POSITION_COUNT) so we never suggest
 *   a team count that would run out of players.
 *
 * Step 2 — Team assignment
 *   One TeamPitchCard is rendered per team. The coach assigns players to
 *   positions by clicking jerseys on the pitch then selecting from a dropdown.
 *
 * Step 3 — Save
 *   "Save Lineup" triggers one saveTeamLineup server action per team,
 *   sequentially. On success the coach is redirected back to the event detail
 *   page.
 *
 * Architecture notes:
 * - This component owns all lineup state.
 * - saveTeamLineup is a server action imported directly (no API route needed).
 * - Errors from save are displayed inline with per-team attribution.
 * - useTransition wraps the save operation so isPending is available.
 */

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TeamPitchCard } from './TeamPitchCard';
import { saveTeamLineup } from '@/app/(dashboard)/events/[id]/planner/actions';
import { POSITION_COUNT } from '@/app/(dashboard)/events/[id]/planner/constants';
import type { LineupSlot } from '@/types';
import type { PlayerRow } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlannerFormProps {
  eventId: string;
  activePlayers: PlayerRow[];
  /** Pre-existing lineups — passed when editing an already-saved plan. */
  existingLineups: ExistingLineup[];
}

interface ExistingLineup {
  teamNumber: number;
  slots: LineupSlot[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlannerForm({ eventId, activePlayers, existingLineups }: PlannerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Step management
  // ---------------------------------------------------------------------------

  const hasExisting = existingLineups.length > 0;

  // If we have existing lineups, start on step 2 pre-loaded.
  const [step, setStep] = useState<1 | 2>(hasExisting ? 2 : 1);

  // ---------------------------------------------------------------------------
  // Step 1 state
  // ---------------------------------------------------------------------------

  // Allow any number of teams up to total players, since teams can have < 10 players
  const maxTeams = activePlayers.length;

  const [teamCount, setTeamCount] = useState<number>(
    hasExisting ? existingLineups.length : Math.min(1, maxTeams),
  );

  // ---------------------------------------------------------------------------
  // Step 2 state — one lineup array per team
  // ---------------------------------------------------------------------------

  // Initialise from existing lineups if present; otherwise empty arrays.
  const [lineups, setLineups] = useState<LineupSlot[][]>(() => {
    if (hasExisting) {
      return Array.from({ length: existingLineups.length }, (_, i) => {
        return existingLineups[i]?.slots ?? [];
      });
    }
    return Array.from({ length: Math.min(2, maxTeams) }, () => []);
  });

  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleTeamCountChange(count: number) {
    setTeamCount(count);
    // Resize the lineups array to match. Preserve existing data for teams that
    // are still in range; clear data for removed teams.
    setLineups((prev) =>
      Array.from({ length: count }, (_, i) => prev[i] ?? []),
    );
  }

  function handleProceedToStep2() {
    setLineups(Array.from({ length: teamCount }, (_, i) => lineups[i] ?? []));
    setStep(2);
  }

  const handleLineupChange = useCallback(
    (teamNumber: number, newSlots: LineupSlot[]) => {
      setLineups((prev) => {
        const updated = [...prev];
        updated[teamNumber - 1] = newSlots;
        return updated;
      });
    },
    [],
  );

  function handleSave() {
    // Validate all teams before making any network call.
    const validationErrors: string[] = [];
    for (let i = 0; i < lineups.length; i++) {
      const filled = lineups[i]?.length ?? 0;
      if (filled < 1) {
        validationErrors[i] = `Team ${i + 1} needs at least 1 player assigned.`;
      } else {
        validationErrors[i] = '';
      }
    }

    setSaveErrors(validationErrors);

    if (validationErrors.some(Boolean)) {
      return;
    }

    setGlobalError(null);

    startTransition(async () => {
      const errors: string[] = new Array(lineups.length).fill('');
      let hasError = false;

      for (let i = 0; i < lineups.length; i++) {
        const result = await saveTeamLineup(eventId, i + 1, lineups[i] ?? []);
        if (!result.success) {
          errors[i] = result.error;
          hasError = true;
        }
      }

      if (hasError) {
        setSaveErrors(errors);
        setGlobalError('Some teams could not be saved. Please review the errors below.');
        return;
      }

      // All saved — navigate back to the event detail page.
      router.push(`/events/${eventId}`);
      router.refresh();
    });
  }

  // ---------------------------------------------------------------------------
  // Derived values for cross-team duplicate warnings
  // ---------------------------------------------------------------------------

  /**
   * For each team, build the Set of player IDs used by all OTHER teams so
   * TeamPitchCard can warn when the same player appears cross-team.
   */
  const otherTeamPlayerIdSets: Set<string>[] = lineups.map((_, teamIdx) => {
    const otherIds = new Set<string>();
    lineups.forEach((slots, idx) => {
      if (idx !== teamIdx) {
        slots.forEach((s) => otherIds.add(s.player_id));
      }
    });
    return otherIds;
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (step === 1) {
    return (
      <Step1TeamCount
        teamCount={teamCount}
        maxTeams={maxTeams}
        activePlayers={activePlayers}
        onTeamCountChange={handleTeamCountChange}
        onProceed={handleProceedToStep2}
      />
    );
  }

  // Step 2
  const allFilled = lineups.every((slots) => slots.length === POSITION_COUNT);

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Assign Players — {lineups.length} {lineups.length === 1 ? 'Team' : 'Teams'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tap a jersey on the pitch to assign a player to that position.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStep(1)}
          disabled={isPending}
          className="
            text-sm text-gray-500 hover:text-gray-700
            focus:outline-none focus:underline
            disabled:opacity-50 transition-colors duration-100
          "
        >
          Change team count
        </button>
      </div>

      {/* Global save error */}
      {globalError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {globalError}
        </div>
      )}

      {/* Team pitch cards */}
      {lineups.map((slots, idx) => (
        <div key={idx}>
          <TeamPitchCard
            teamNumber={idx + 1}
            activePlayers={activePlayers}
            otherTeamPlayerIds={otherTeamPlayerIdSets[idx] ?? new Set()}
            lineup={slots}
            onLineupChange={handleLineupChange}
          />
          {saveErrors[idx] && (
            <p
              role="alert"
              className="mt-2 text-sm text-red-600 px-1"
            >
              {saveErrors[idx]}
            </p>
          )}
        </div>
      ))}

      {/* Save action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          aria-busy={isPending}
          className="
            inline-flex items-center gap-2
            rounded-lg bg-green-700 px-5 py-2.5
            text-sm font-semibold text-white
            hover:bg-green-800 active:bg-green-900
            focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-100
          "
        >
          {isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving…
            </>
          ) : (
            'Save Lineup'
          )}
        </button>

        {!allFilled && !isPending && (
          <p className="text-xs text-amber-600">
            Fill all positions before saving
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step1TeamCount
// ---------------------------------------------------------------------------

interface Step1Props {
  teamCount: number;
  maxTeams: number;
  activePlayers: PlayerRow[];
  onTeamCountChange: (count: number) => void;
  onProceed: () => void;
}

function Step1TeamCount({
  teamCount,
  maxTeams,
  activePlayers,
  onTeamCountChange,
  onProceed,
}: Step1Props) {
  const teamOptions = Array.from({ length: maxTeams }, (_, i) => i + 1);

  return (
    <div className="max-w-sm">
      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 mb-1">
          How many teams are you planning?
        </legend>
        <p className="text-sm text-gray-500 mb-4">
          {activePlayers.length} active players available.
          Teams can have any number of players (up to {POSITION_COUNT} starting positions).
        </p>

        <div className="space-y-2">
          {teamOptions.map((n) => (
            <label
              key={n}
              className={`
                flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer
                transition-colors duration-100
                ${teamCount === n
                  ? 'border-green-600 bg-green-50 ring-1 ring-green-600'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
              `}
            >
              <input
                type="radio"
                name="team-count"
                value={n}
                checked={teamCount === n}
                onChange={() => onTeamCountChange(n)}
                className="sr-only"
              />
              <span className="
                w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                border-gray-300
              ">
                {teamCount === n && (
                  <span className="w-2.5 h-2.5 rounded-full bg-green-600 block" />
                )}
              </span>
              <span className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  {n} {n === 1 ? 'team' : 'teams'}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={onProceed}
        className="
          mt-6 inline-flex items-center gap-2
          rounded-lg bg-green-700 px-5 py-2.5
          text-sm font-semibold text-white
          hover:bg-green-800 active:bg-green-900
          focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
          transition-colors duration-100
        "
      >
        Set up {teamCount === 1 ? 'team' : 'teams'}
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
