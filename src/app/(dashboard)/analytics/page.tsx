import type { Metadata } from 'next';
import { Suspense } from 'react';
import { fetchAnalyticsData } from './queries';
import { PlayerAttendanceChart } from '@/components/features/analytics/PlayerAttendanceChart';
import { AttendanceTrendChart } from '@/components/features/analytics/AttendanceTrendChart';
import { StatusBreakdownChart } from '@/components/features/analytics/StatusBreakdownChart';
import { PlayerRankingCards } from '@/components/features/analytics/PlayerRankingCards';

export const metadata: Metadata = {
  title: 'Insights — Caerphilly RFC',
};

// ---------------------------------------------------------------------------
// Loading skeletons — shown via Suspense while the async section fetches
// ---------------------------------------------------------------------------

function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div
      className={`${height} animate-pulse rounded-xl bg-gray-100`}
      aria-busy="true"
      aria-label="Loading chart"
    />
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading data">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-lg bg-gray-100"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper — consistent card styling for each chart section
// ---------------------------------------------------------------------------

function ChartCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-xl border border-gray-200 bg-white px-5 py-5 sm:px-6 sm:py-6"
    >
      <div className="mb-4">
        <h2 id={id} className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Summary stats row
// ---------------------------------------------------------------------------

function SummaryStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The async data-fetching section — wrapped in Suspense by the page
// ---------------------------------------------------------------------------

async function AnalyticsDashboard() {
  let data;

  try {
    data = await fetchAnalyticsData();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return (
      <div
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        Failed to load analytics data. Please try refreshing the page.
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-1 font-mono text-xs text-red-500">{message}</p>
        )}
      </div>
    );
  }

  const {
    playerStats,
    teamTrend,
    statusBreakdown,
    totalEventsAnalysed,
    totalAttendanceRecords,
  } = data;

  // Overall team attendance rate (average of all player rates).
  const avgRate =
    playerStats.length > 0
      ? Math.round(
          playerStats.reduce((sum, p) => sum + p.attendanceRate, 0) /
            playerStats.length,
        )
      : null;

  // Top performer (first in sorted list).
  const topPerformer = playerStats[0] ?? null;

  // Number of players with < 50% attendance.
  const atRiskCount = playerStats.filter((p) => p.attendanceRate < 50).length;

  const hasAnyData = totalAttendanceRecords > 0;

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-20 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100"
          aria-hidden="true"
        >
          <svg
            className="h-7 w-7 text-green-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900">No attendance data yet</p>
        <p className="mt-1 text-sm text-gray-500 max-w-sm">
          Analytics will appear once you have taken attendance at one or more past
          events. Head to Events to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats row */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SummaryStat
          label="Events Analysed"
          value={totalEventsAnalysed}
          sub="past events with a register"
        />
        <SummaryStat
          label="Players Tracked"
          value={playerStats.length}
          sub="with at least 1 event"
        />
        <SummaryStat
          label="Avg Attendance Rate"
          value={avgRate !== null ? `${avgRate}%` : '—'}
          sub="across all active players"
        />
        <SummaryStat
          label="At Risk"
          value={atRiskCount}
          sub="players below 50%"
        />
      </dl>

      {/* Top Regulars + Players to Watch */}
      <ChartCard
        id="ranking-heading"
        title="Player Rankings"
        description="Top 5 regulars and 5 players who may need a conversation."
      >
        <PlayerRankingCards playerStats={playerStats} />
      </ChartCard>

      {/* Player Attendance Rate — horizontal bar chart */}
      <ChartCard
        id="player-bar-heading"
        title="Player Attendance Rates"
        description="Individual attendance percentage for all tracked players, sorted highest to lowest."
      >
        {topPerformer && (
          <p className="mb-3 text-xs text-gray-500">
            Top performer:{' '}
            <span className="font-medium text-gray-800">{topPerformer.playerName}</span>
            {' '}at{' '}
            <span className="font-semibold text-green-700">{topPerformer.attendanceRate}%</span>
          </p>
        )}
        <PlayerAttendanceChart data={playerStats} />
      </ChartCard>

      {/* Two-column row: Trend + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <ChartCard
          id="trend-heading"
          title="Attendance Trend"
          description={`Overall team attendance rate across the last ${teamTrend.length} events.`}
        >
          <AttendanceTrendChart data={teamTrend} />
        </ChartCard>

        {/* Status Distribution */}
        <ChartCard
          id="status-heading"
          title="Status Distribution"
          description="Breakdown of all attendance records by status type."
        >
          <StatusBreakdownChart
            data={statusBreakdown}
            totalRecords={totalAttendanceRecords}
          />
        </ChartCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page skeleton — shown while AnalyticsDashboard fetches data
// ---------------------------------------------------------------------------

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary stats skeleton */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5 animate-pulse"
          >
            <div className="h-3 w-24 rounded bg-gray-200 mb-3" />
            <div className="h-8 w-16 rounded-lg bg-gray-200" />
          </div>
        ))}
      </dl>

      {/* Rankings skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 sm:px-6 sm:py-6">
        <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <CardSkeleton />
          </div>
          <div className="flex-1">
            <CardSkeleton />
          </div>
        </div>
      </div>

      {/* Bar chart skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 sm:px-6 sm:py-6">
        <div className="h-4 w-48 rounded bg-gray-200 mb-4" />
        <ChartSkeleton height="h-80" />
      </div>

      {/* Line + Pie skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white px-5 py-5 sm:px-6 sm:py-6"
          >
            <div className="h-4 w-36 rounded bg-gray-200 mb-4" />
            <ChartSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="mt-1 text-sm text-gray-500">
          Attendance patterns and trends across all past events.
        </p>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
