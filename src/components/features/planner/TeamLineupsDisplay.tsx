/**
 * TeamLineupsDisplay
 *
 * Read-only component for showing saved match day lineups on the event detail page.
 *
 * Displays each team as a card with an ordered list of positions and player names.
 * Used server-side rendered on the event detail page — no client state needed.
 */

import Link from 'next/link';
import { POSITION_NAMES } from '@/app/(dashboard)/events/[id]/planner/constants';
import type { TeamLineupWithPlayers } from '@/types';
import type { PlayerRow } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamLineupsDisplayProps {
  eventId: string;
  lineups: TeamLineupWithPlayers[];
  activePlayers: PlayerRow[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TeamLineupsDisplay({ eventId, lineups, activePlayers }: TeamLineupsDisplayProps) {
  if (lineups.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Team Lineups</h2>
        <Link
          href={`/events/${eventId}/planner`}
          className="
            text-sm font-medium text-green-700 hover:text-green-900
            focus:outline-none focus:underline
            transition-colors duration-100
          "
        >
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {lineups.map((lineup) => (
          <TeamCard key={lineup.id} lineup={lineup} activePlayers={activePlayers} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TeamCard — one team's lineup
// ---------------------------------------------------------------------------

interface TeamCardProps {
  lineup: TeamLineupWithPlayers;
  activePlayers: PlayerRow[];
}

function TeamCard({ lineup }: TeamCardProps) {
  // Sort slots by position number so they always display 1 → 10.
  const sortedSlots = [...lineup.lineups].sort((a, b) => a.position - b.position);

  // Separate starting positions (1-10) from assigned subs (11+)
  const startingPositions = sortedSlots.filter(s => s.position >= 1 && s.position <= 10);
  const assignedSubs = sortedSlots.filter(s => s.position >= 11);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-4 py-3 bg-green-700">
        <h3 className="text-sm font-semibold text-white">Team {lineup.team_number}</h3>
      </div>

      {/* Position list */}
      <ul className="divide-y divide-gray-100">
        {startingPositions.map((slot) => {
          const positionName = POSITION_NAMES[slot.position] ?? `Position ${slot.position}`;
          const playerName = slot.player
            ? `${slot.player.first_name} ${slot.player.last_name}`
            : 'Unknown player';

          return (
            <li key={slot.position} className="flex items-center gap-3 px-4 py-2.5">
              {/* Position badge */}
              <span className="
                w-7 h-7 rounded-full bg-green-50 text-green-700
                flex items-center justify-center
                text-xs font-bold shrink-0
              ">
                {slot.position}
              </span>

              {/* Position name + player */}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400 leading-none">{positionName}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{playerName}</p>
              </div>

              {/* Player's preferred position if different */}
              {slot.player?.position && (
                <span className="text-xs text-gray-300 shrink-0 hidden sm:inline">
                  {slot.player.position}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Assigned substitutes section */}
      {assignedSubs.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 bg-green-50">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-2">
            Substitutes ({assignedSubs.length})
          </p>
          <ul className="space-y-1">
            {assignedSubs.map((slot) => {
              const playerName = slot.player
                ? `${slot.player.first_name} ${slot.player.last_name}`
                : 'Unknown player';
              return (
                <li key={slot.position} className="text-sm text-gray-900 font-medium">
                  {playerName}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
