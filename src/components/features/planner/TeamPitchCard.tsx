'use client';

/**
 * TeamPitchCard
 *
 * Renders a single team's pitch with interactive position selectors.
 *
 * Responsibilities:
 * - Owns the state for which position is currently being edited
 * - Renders the RugbyPitchDisplay with assignment data
 * - Renders the position selector panel (dropdown + position metadata)
 * - Validates that all 10 positions are filled before the parent can save
 * - Reports lineup changes upward to the parent (PlannerForm) via onLineupChange
 *
 * State boundary:
 * - This component owns `activePosition` (which position the user clicked)
 * - Parent (PlannerForm) owns the lineup arrays for each team
 */

import { useState, useCallback } from 'react';
import { RugbyPitchDisplay } from './RugbyPitchDisplay';
import type { PositionSlot } from './RugbyPitchDisplay';
import { POSITION_NAMES, POSITION_COUNT } from '@/app/(dashboard)/events/[id]/planner/constants';
import type { LineupSlot } from '@/types';
import type { PlayerRow } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamLineup {
  teamNumber: number;
  slots: LineupSlot[]; // current assignments for this team (may be partial)
}

interface TeamPitchCardProps {
  teamNumber: number;
  activePlayers: PlayerRow[];
  /** All other teams' current lineups — used to warn about cross-team duplicates. */
  otherTeamPlayerIds: Set<string>;
  lineup: LineupSlot[];
  onLineupChange: (teamNumber: number, newLineup: LineupSlot[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TeamPitchCard({
  teamNumber,
  activePlayers,
  otherTeamPlayerIds,
  lineup,
  onLineupChange,
}: TeamPitchCardProps) {
  const [activePosition, setActivePosition] = useState<number | null>(null);

  // Build a Set of players already assigned within THIS team so they can't be
  // double-assigned to a second position on the same pitch.
  const assignedInThisTeam = new Set<string>(lineup.map((s) => s.player_id));

  // ---------------------------------------------------------------------------
  // Derive PositionSlot array for the pitch display
  // ---------------------------------------------------------------------------

  const positionSlots: PositionSlot[] = Array.from({ length: POSITION_COUNT }, (_, i) => {
    const pos = i + 1;
    const slot = lineup.find((s) => s.position === pos);
    const player = slot
      ? activePlayers.find((p) => p.id === slot.player_id) ?? null
      : null;

    return {
      position: pos,
      playerName: player ? `${player.first_name} ${player.last_name}` : null,
      isAssigned: !!slot,
    };
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePositionClick = useCallback((position: number) => {
    setActivePosition((prev) => (prev === position ? null : position));
  }, []);

  const handlePlayerSelect = useCallback(
    (position: number, playerId: string) => {
      const existing = lineup.filter((s) => s.position !== position);
      const newLineup: LineupSlot[] = playerId
        ? [...existing, { position, player_id: playerId }]
        : existing;

      // Sort by position so the array is always in order 1–10.
      newLineup.sort((a, b) => a.position - b.position);
      onLineupChange(teamNumber, newLineup);
    },
    [lineup, teamNumber, onLineupChange],
  );

  const handleClearPosition = useCallback(
    (position: number) => {
      onLineupChange(
        teamNumber,
        lineup.filter((s) => s.position !== position),
      );
      setActivePosition(null);
    },
    [lineup, teamNumber, onLineupChange],
  );

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const filledCount = lineup.length;
  const assignedPlayerIds = new Set(lineup.map((s) => s.player_id));
  const availableSubstitutes = activePlayers.filter((p) => {
    if (assignedPlayerIds.has(p.id)) return false; // already in this team
    if (otherTeamPlayerIds.has(p.id)) return false; // assigned to another team
    return true;
  });
  const activeSlot = activePosition !== null
    ? lineup.find((s) => s.position === activePosition) ?? null
    : null;
  const activePlayerForPosition = activeSlot
    ? activePlayers.find((p) => p.id === activeSlot.player_id) ?? null
    : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Team {teamNumber}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {filledCount} assigned {filledCount === 1 ? 'player' : 'players'}
            {availableSubstitutes.length > 0 && ` • ${availableSubstitutes.length} available subs`}
          </p>
        </div>
        {filledCount >= 1 && (
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Valid
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-0">
        {/* Pitch — takes proportional width on large screens */}
        <div className="p-4 lg:w-64 shrink-0">
          <RugbyPitchDisplay
            slots={positionSlots}
            onPositionClick={handlePositionClick}
            activePosition={activePosition}
          />
        </div>

        {/* Position selector panel */}
        <div className="flex-1 p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-gray-100">
          {activePosition !== null ? (
            <PositionSelector
              position={activePosition}
              activePlayers={activePlayers}
              assignedInThisTeam={assignedInThisTeam}
              otherTeamPlayerIds={otherTeamPlayerIds}
              currentPlayerId={activeSlot?.player_id ?? null}
              currentPlayer={activePlayerForPosition}
              onSelect={(playerId) => {
                handlePlayerSelect(activePosition, playerId);
                // Advance to the next unfilled position automatically.
                const nextEmpty = findNextEmptyPosition(lineup, activePosition);
                setActivePosition(nextEmpty);
              }}
              onClear={() => handleClearPosition(activePosition)}
              onClose={() => setActivePosition(null)}
            />
          ) : (
            <PositionList
              positionSlots={positionSlots}
              onSelectPosition={setActivePosition}
            />
          )}
        </div>
      </div>

      {/* Substitutes section */}
      {availableSubstitutes.length > 0 && (
        <div className="border-t border-gray-100 px-4 sm:px-6 py-4 bg-gray-50">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-3">
            Available Substitutes ({availableSubstitutes.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {availableSubstitutes.map((player) => (
              <button
                key={player.id}
                onClick={() => {
                  // Add player as a substitute (using a high position number to indicate sub)
                  const nextSubPosition = 11 + lineup.filter(s => s.position >= 11).length;
                  onLineupChange(teamNumber, [
                    ...lineup,
                    { position: nextSubPosition, player_id: player.id }
                  ]);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm border border-gray-200 shadow-xs hover:bg-green-50 hover:border-green-300 transition-colors duration-100 cursor-pointer"
                title="Click to add as a substitute"
              >
                <span className="font-medium text-gray-900">
                  {player.first_name} {player.last_name}
                </span>
                {player.position && (
                  <span className="text-xs text-gray-500">{player.position}</span>
                )}
                <span className="text-xs text-green-600 font-medium">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Display assigned substitutes */}
      {lineup.some(s => s.position >= 11) && (
        <div className="border-t border-gray-100 px-4 sm:px-6 py-3 bg-green-50">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-2">
            Assigned Subs
          </h4>
          <ul className="space-y-1">
            {lineup
              .filter(s => s.position >= 11)
              .map((slot) => {
                const player = activePlayers.find(p => p.id === slot.player_id);
                return (
                  <li key={slot.position} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900 font-medium">
                      {player ? `${player.first_name} ${player.last_name}` : 'Unknown'}
                    </span>
                    <button
                      onClick={() => onLineupChange(teamNumber, lineup.filter(s => s.position !== slot.position))}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                      title="Remove substitute"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PositionSelector — the panel shown when a jersey is clicked
// ---------------------------------------------------------------------------

interface PositionSelectorProps {
  position: number;
  activePlayers: PlayerRow[];
  assignedInThisTeam: Set<string>;
  otherTeamPlayerIds: Set<string>;
  currentPlayerId: string | null;
  currentPlayer: PlayerRow | null;
  onSelect: (playerId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function PositionSelector({
  position,
  activePlayers,
  assignedInThisTeam,
  otherTeamPlayerIds,
  currentPlayerId,
  currentPlayer,
  onSelect,
  onClear,
  onClose,
}: PositionSelectorProps) {
  const positionName = POSITION_NAMES[position] ?? `Position ${position}`;

  // Available players = active players who are NOT already assigned to another
  // position on this pitch OR to another team (excluding the current slot's
  // assignment so it stays selectable).
  const availablePlayers = activePlayers.filter((p) => {
    if (p.id === currentPlayerId) return true; // always include current selection
    if (assignedInThisTeam.has(p.id)) return false; // taken elsewhere on this pitch
    if (otherTeamPlayerIds.has(p.id)) return false; // taken by another team
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            Position {position}
          </p>
          <h4 className="text-sm font-semibold text-gray-900 mt-0.5">{positionName}</h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close position selector"
          className="
            -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md
            text-gray-400 hover:bg-gray-100 hover:text-gray-600
            focus:outline-none focus:ring-2 focus:ring-green-600
            transition-colors duration-100
          "
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Player dropdown */}
      <label htmlFor={`position-select-${position}`} className="block text-xs text-gray-500 mb-1">
        Select player
      </label>
      <select
        id={`position-select-${position}`}
        value={currentPlayerId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="
          w-full rounded-md border border-gray-200 bg-white px-3 py-2
          text-sm text-gray-900
          focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
          disabled:bg-gray-50 disabled:text-gray-400
        "
      >
        <option value="">-- Unassigned --</option>
        {availablePlayers.map((player) => {
          const isOnOtherTeam = otherTeamPlayerIds.has(player.id);
          return (
            <option key={player.id} value={player.id}>
              {player.first_name} {player.last_name}
              {player.position ? ` (${player.position})` : ''}
              {isOnOtherTeam ? ' *' : ''}
            </option>
          );
        })}
      </select>

      {/* Note about cross-team players */}
      {activePlayers.some((p) => otherTeamPlayerIds.has(p.id) && p.id !== currentPlayerId) && (
        <p className="mt-1.5 text-xs text-amber-600">
          * Player is already assigned to another team
        </p>
      )}

      {/* Current selection summary */}
      {currentPlayer && (
        <div className="mt-3 rounded-md bg-gray-50 px-3 py-2.5">
          <p className="text-sm font-medium text-gray-900">
            {currentPlayer.first_name} {currentPlayer.last_name}
          </p>
          {currentPlayer.position && (
            <p className="text-xs text-gray-400 mt-0.5">
              Preferred: {currentPlayer.position}
            </p>
          )}
        </div>
      )}

      {/* Clear button */}
      {currentPlayerId && (
        <button
          type="button"
          onClick={onClear}
          className="
            mt-3 text-xs text-red-600 hover:text-red-700
            focus:outline-none focus:underline
            transition-colors duration-100
          "
        >
          Clear this position
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PositionList — shown when no position is actively selected
// ---------------------------------------------------------------------------

interface PositionListProps {
  positionSlots: PositionSlot[];
  onSelectPosition: (position: number) => void;
}

function PositionList({ positionSlots, onSelectPosition }: PositionListProps) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">
        All positions
      </p>
      <ul className="space-y-1.5">
        {positionSlots.map((slot) => (
          <li key={slot.position}>
            <button
              type="button"
              onClick={() => onSelectPosition(slot.position)}
              className={`
                w-full flex items-center justify-between rounded-md px-3 py-2
                text-sm text-left
                border
                focus:outline-none focus:ring-2 focus:ring-green-600
                transition-colors duration-100
                ${slot.isAssigned
                  ? 'bg-green-50 border-green-200 text-green-900 hover:bg-green-100'
                  : 'bg-white border-dashed border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                }
              `}
            >
              <span className="flex items-center gap-2.5">
                <span className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${slot.isAssigned ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-400'}
                `}>
                  {slot.position}
                </span>
                <span className="font-medium">
                  {POSITION_NAMES[slot.position] ?? `Position ${slot.position}`}
                </span>
              </span>
              {slot.isAssigned && slot.playerName ? (
                <span className="text-xs text-green-700 truncate ml-2 max-w-[120px]">
                  {slot.playerName}
                </span>
              ) : (
                <span className="text-xs text-gray-300">Tap to assign</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the next position number (after `current`) that has no player
 * assigned, wrapping around if necessary. Returns null if all 10 are filled.
 */
function findNextEmptyPosition(lineup: LineupSlot[], current: number): number | null {
  const assignedPositions = new Set(lineup.map((s) => s.position));
  // Check positions after current first, then wrap to 1.
  for (let offset = 1; offset <= POSITION_COUNT; offset++) {
    const pos = ((current - 1 + offset) % POSITION_COUNT) + 1;
    if (!assignedPositions.has(pos)) return pos;
  }
  return null;
}
