/**
 * Analytics data queries.
 *
 * All database access for the analytics/insights page lives here.
 * This module is server-only — it uses the server Supabase client and must
 * never be imported by client components.
 *
 * The returned shapes are plain serialisable objects so they can be passed
 * directly as props across the server→client boundary into chart components.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  AnalyticsData,
  PlayerAttendanceStat,
  TeamAttendanceTrend,
  AttendanceStatusBreakdown,
} from '@/types';
import type { AttendanceStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of past events to include in the team attendance trend chart. */
const TREND_EVENT_LIMIT = 10;

// ---------------------------------------------------------------------------
// Main query function
// ---------------------------------------------------------------------------

/**
 * Fetches and aggregates all data required by the analytics dashboard.
 *
 * Three parallel queries are issued:
 *  1. All active players (for per-player stats).
 *  2. All past, non-cancelled events (for trend chart).
 *  3. All attendance records where player_id is set (coach attendance is
 *     excluded from player-facing analytics).
 *
 * Aggregation is performed in JavaScript rather than SQL to keep the query
 * layer simple and avoid complex CTEs through the Supabase client.
 *
 * @throws {Error} if any of the Supabase queries return an error.
 */
export async function fetchAnalyticsData(): Promise<AnalyticsData> {
  const supabase = await createSupabaseServerClient();

  const now = new Date().toISOString();

  const [playersResult, eventsResult, attendanceResult] = await Promise.all([
    supabase
      .from('players')
      .select('id, first_name, last_name, position, status')
      .eq('status', 'active')
      .order('last_name', { ascending: true }),

    supabase
      .from('events')
      .select('id, title, event_date')
      .eq('is_cancelled', false)
      .lt('event_date', now)
      .order('event_date', { ascending: false }),

    // Only player attendance (coach_id is null on player rows).
    // Selecting all rows: we need status for breakdown + event_id + player_id.
    supabase
      .from('attendance')
      .select('event_id, player_id, status')
      .not('player_id', 'is', null),
  ]);

  if (playersResult.error) {
    throw new Error(`Failed to fetch players: ${playersResult.error.message}`);
  }
  if (eventsResult.error) {
    throw new Error(`Failed to fetch events: ${eventsResult.error.message}`);
  }
  if (attendanceResult.error) {
    throw new Error(`Failed to fetch attendance: ${attendanceResult.error.message}`);
  }

  const players = playersResult.data ?? [];
  const pastEvents = eventsResult.data ?? [];
  const allAttendance = attendanceResult.data ?? [];

  // ---------------------------------------------------------------------------
  // Build a set of event IDs that actually have attendance records.
  // Only these events count toward a player's "total events" denominator.
  // An event with no register taken should not penalise a player's rate.
  // ---------------------------------------------------------------------------

  const eventsWithRegister = new Set<string>();
  for (const row of allAttendance) {
    eventsWithRegister.add(row.event_id);
  }

  // Keep only past events that had a register taken.
  const scoredEventIds = new Set(
    pastEvents
      .filter((e) => eventsWithRegister.has(e.id))
      .map((e) => e.id),
  );

  // ---------------------------------------------------------------------------
  // Per-player stats
  // ---------------------------------------------------------------------------

  // Aggregate attendance per player: present count and per-event totals.
  type PlayerBucket = { present: number; eventsRecorded: Set<string> };
  const playerBuckets = new Map<string, PlayerBucket>();

  for (const row of allAttendance) {
    // Only count events that are in our "scored" set (past + register taken).
    if (!scoredEventIds.has(row.event_id)) continue;
    if (!row.player_id) continue;

    const bucket = playerBuckets.get(row.player_id) ?? {
      present: 0,
      eventsRecorded: new Set<string>(),
    };

    bucket.eventsRecorded.add(row.event_id);

    if (row.status === 'present' || row.status === 'late') {
      bucket.present += 1;
    }

    playerBuckets.set(row.player_id, bucket);
  }

  const playerStats: PlayerAttendanceStat[] = players
    .map((player) => {
      const bucket = playerBuckets.get(player.id);
      const totalEvents = bucket?.eventsRecorded.size ?? 0;
      const presentCount = bucket?.present ?? 0;
      const attendanceRate =
        totalEvents > 0 ? Math.round((presentCount / totalEvents) * 100) : 0;

      return {
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        position: player.position,
        totalEvents,
        presentCount,
        attendanceRate,
      };
    })
    // Only include players who have at least one event recorded against them.
    // Players who joined after all past events would otherwise show 0/0 = 0%.
    .filter((s) => s.totalEvents > 0)
    // Sort: highest attendance first.
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  // ---------------------------------------------------------------------------
  // Team attendance trend (last N events with a register)
  // ---------------------------------------------------------------------------

  // Re-order past events ascending for the chart (oldest → newest).
  const scoredEventsAscending = pastEvents
    .filter((e) => scoredEventIds.has(e.id))
    .slice(0, TREND_EVENT_LIMIT)
    .reverse();

  // Build per-event totals across all players.
  type EventBucket = { present: number; total: number };
  const eventBuckets = new Map<string, EventBucket>();

  for (const row of allAttendance) {
    if (!scoredEventIds.has(row.event_id)) continue;

    const bucket = eventBuckets.get(row.event_id) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (row.status === 'present' || row.status === 'late') {
      bucket.present += 1;
    }
    eventBuckets.set(row.event_id, bucket);
  }

  const teamTrend: TeamAttendanceTrend[] = scoredEventsAscending.map((event) => {
    const bucket = eventBuckets.get(event.id) ?? { present: 0, total: 0 };
    const attendanceRate =
      bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 100) : 0;

    // Use a short date label for the chart x-axis (e.g. "15 Mar").
    const date = new Date(event.event_date);
    const shortDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });

    return {
      eventDate: shortDate,
      eventTitle: event.title,
      attendanceRate,
      presentCount: bucket.present,
      totalCount: bucket.total,
    };
  });

  // ---------------------------------------------------------------------------
  // Status distribution breakdown
  // ---------------------------------------------------------------------------

  const statusCounts: Record<AttendanceStatus, number> = {
    present: 0,
    absent: 0,
    late: 0,
    injured: 0,
    excused: 0,
  };

  for (const row of allAttendance) {
    const s = row.status as AttendanceStatus;
    if (s in statusCounts) {
      statusCounts[s] += 1;
    }
  }

  const totalRecords = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  const STATUS_LABELS: Record<AttendanceStatus, string> = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    injured: 'Injured',
    excused: 'Excused',
  };

  const statusBreakdown: AttendanceStatusBreakdown[] = (
    Object.entries(statusCounts) as [AttendanceStatus, number][]
  )
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      status: STATUS_LABELS[status],
      count,
      percentage: totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    playerStats,
    teamTrend,
    statusBreakdown,
    totalEventsAnalysed: scoredEventIds.size,
    totalAttendanceRecords: totalRecords,
  };
}
