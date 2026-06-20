'use client';

/**
 * PlayerRankingCards
 *
 * Two lists side by side (or stacked on mobile):
 *  - "Top Regulars": top 5 players by attendance rate (highest first)
 *  - "Players to Watch": bottom 5 players by attendance rate (lowest first)
 *
 * Each card shows: rank badge, player name, position, appearances, rate.
 *
 * This is a client component because it lives alongside other client chart
 * islands — all data is passed in as props, no browser APIs are used.
 */

import type { PlayerAttendanceStat } from '@/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerRankingCardsProps {
  /** Full sorted list (high → low). Slicing is done inside this component. */
  playerStats: PlayerAttendanceStat[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RANK_LIMIT = 5;

function attendanceColour(rate: number): string {
  if (rate >= 80) return 'text-green-700 bg-green-50';
  if (rate >= 50) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

function rankBadgeColour(rank: number, variant: 'top' | 'watch'): string {
  if (variant === 'top') {
    const colours = [
      'bg-yellow-100 text-yellow-800', // 1st — gold
      'bg-gray-100 text-gray-600',     // 2nd — silver
      'bg-orange-50 text-orange-700',  // 3rd — bronze
    ];
    return colours[rank - 1] ?? 'bg-gray-50 text-gray-500';
  }
  return 'bg-red-50 text-red-600';
}

// ---------------------------------------------------------------------------
// Sub-component: a single ranking list
// ---------------------------------------------------------------------------

interface RankingListProps {
  title: string;
  description: string;
  players: PlayerAttendanceStat[];
  variant: 'top' | 'watch';
  emptyMessage: string;
}

function RankingList({
  title,
  description,
  players,
  variant,
  emptyMessage,
}: RankingListProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-gray-400 italic">{emptyMessage}</p>
      ) : (
        <ol className="space-y-2" role="list">
          {players.map((player, index) => {
            const rank = index + 1;
            return (
              <li
                key={player.playerId}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2.5"
              >
                {/* Rank badge */}
                <span
                  className={`
                    h-6 w-6 rounded-full text-xs font-bold
                    flex items-center justify-center shrink-0
                    ${rankBadgeColour(rank, variant)}
                  `}
                  aria-label={`Rank ${rank}`}
                >
                  {rank}
                </span>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {player.playerName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {player.position ?? 'No position'} &middot;{' '}
                    {player.presentCount}/{player.totalEvents} events
                  </p>
                </div>

                {/* Attendance rate badge */}
                <span
                  className={`
                    shrink-0 inline-flex items-center rounded-full
                    px-2.5 py-0.5 text-xs font-semibold tabular-nums
                    ${attendanceColour(player.attendanceRate)}
                  `}
                >
                  {player.attendanceRate}%
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlayerRankingCards({ playerStats }: PlayerRankingCardsProps) {
  // playerStats is already sorted high → low from the server query.
  const topPlayers = playerStats.slice(0, RANK_LIMIT);

  // Bottom players: reverse and take the first RANK_LIMIT.
  // Filter to players who have at least 1 event so a brand-new player with
  // no events doesn't appear in the "watch" list.
  const bottomPlayers = [...playerStats]
    .filter((p) => p.totalEvents > 0)
    .reverse()
    .slice(0, RANK_LIMIT);

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <RankingList
        title="Top Regulars"
        description="Highest attendance rates in the squad"
        players={topPlayers}
        variant="top"
        emptyMessage="No player data yet."
      />
      <RankingList
        title="Players to Watch"
        description="Lowest attendance — may need a conversation"
        players={bottomPlayers}
        variant="watch"
        emptyMessage="No player data yet."
      />
    </div>
  );
}
