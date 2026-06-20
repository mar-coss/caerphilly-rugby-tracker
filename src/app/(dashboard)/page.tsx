import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EventTypeBadge } from '@/components/features/events/EventTypeBadge';
import { formatDateTime } from '@/lib/utils';
import type { EventWithAttendanceSummary } from '@/types';

export const metadata: Metadata = {
  title: 'Dashboard — Caerphilly RFC',
};

// ---------------------------------------------------------------------------
// Quick stats
// ---------------------------------------------------------------------------

async function QuickStats() {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [playersResult, coachesResult, upcomingResult, monthResult] = await Promise.all([
    supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('coaches')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('is_cancelled', false)
      .gte('event_date', now.toISOString()),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('is_cancelled', false)
      .gte('event_date', startOfMonth)
      .lte('event_date', endOfMonth),
  ]);

  const stats = [
    {
      label: 'Active Players',
      value: playersResult.count ?? 0,
      href: '/players',
      colourClass: 'bg-blue-50 text-blue-700 ring-blue-100',
    },
    {
      label: 'Coaches',
      value: coachesResult.count ?? 0,
      href: '/coaches',
      colourClass: 'bg-purple-50 text-purple-700 ring-purple-100',
    },
    {
      label: 'Upcoming Events',
      value: upcomingResult.count ?? 0,
      href: '/events',
      colourClass: 'bg-green-50 text-green-700 ring-green-100',
    },
    {
      label: 'Events This Month',
      value: monthResult.count ?? 0,
      href: '/events',
      colourClass: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
  ];

  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="
            group rounded-xl border border-gray-200 bg-white p-4 sm:p-5
            hover:shadow-md hover:border-gray-300
            focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
            transition-all duration-150
          "
        >
          <dt className="text-xs font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
            {stat.label}
          </dt>
          <dd
            className={`
              mt-2 text-2xl sm:text-3xl font-bold rounded-lg inline-block px-2.5 py-0.5
              ring-1 ring-inset ${stat.colourClass}
            `}
          >
            {stat.value}
          </dd>
        </Link>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Upcoming events
// ---------------------------------------------------------------------------

async function UpcomingEvents() {
  const supabase = await createSupabaseServerClient();

  const [eventsResult, attendanceResult] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('is_cancelled', false)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(5),
    supabase
      .from('attendance')
      .select('event_id, status'),
  ]);

  const rawEvents = eventsResult.data ?? [];

  if (rawEvents.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-10 text-center">
        <p className="text-sm font-medium text-gray-900">No upcoming events</p>
        <p className="mt-1 text-xs text-gray-500">
          Create an event to start tracking attendance.
        </p>
        <Link
          href="/events"
          className="
            mt-4 inline-block rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white
            hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
            transition-colors duration-150
          "
        >
          Go to Events
        </Link>
      </div>
    );
  }

  // Build per-event attendance summary.
  const summaryMap = new Map<string, { total: number; present: number }>();
  for (const row of attendanceResult.data ?? []) {
    const current = summaryMap.get(row.event_id) ?? { total: 0, present: 0 };
    current.total += 1;
    if (row.status === 'present' || row.status === 'late') current.present += 1;
    summaryMap.set(row.event_id, current);
  }

  const events: EventWithAttendanceSummary[] = rawEvents.map((event) => {
    const summary = summaryMap.get(event.id) ?? { total: 0, present: 0 };
    return {
      ...event,
      attendance_count: summary.total,
      present_count:    summary.present,
      absent_count:     summary.total - summary.present,
    };
  });

  return (
    <ul className="space-y-2.5" role="list">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/events/${event.id}`}
            className="
              group flex items-start justify-between gap-3 rounded-xl
              border border-gray-200 bg-white px-4 py-3.5 sm:px-5 sm:py-4
              hover:shadow-md hover:border-green-200 hover:bg-green-50/30
              focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1
              transition-all duration-150
            "
          >
            {/* Left: event details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <EventTypeBadge type={event.event_type} />
              </div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-green-800 transition-colors truncate">
                {event.title}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 truncate">
                {formatDateTime(event.event_date)}
                {event.location && (
                  <span className="text-gray-400"> · {event.location}</span>
                )}
              </p>
            </div>

            {/* Right: attendance mini-stat */}
            <div className="shrink-0 text-right">
              {event.attendance_count > 0 ? (
                <>
                  <p className="text-sm font-semibold text-gray-900">
                    {event.present_count}
                    <span className="font-normal text-gray-400">/{event.attendance_count}</span>
                  </p>
                  <p className="text-xs text-gray-400">present</p>
                </>
              ) : (
                <p className="text-xs text-gray-400">No register</p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

/**
 * Shows the most recent event for which attendance was actually taken
 * (i.e. at least one player was marked present or late).
 */
async function RecentActivity() {
  const supabase = await createSupabaseServerClient();

  // Find the most recent event that has at least one present/late attendance.
  // We fetch the most recent 20 past events and check attendance counts in JS
  // to avoid a complex subquery.
  const [pastEventsResult, attendanceResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, event_date')
      .eq('is_cancelled', false)
      .lt('event_date', new Date().toISOString())
      .order('event_date', { ascending: false })
      .limit(20),
    supabase
      .from('attendance')
      .select('event_id, status'),
  ]);

  const pastEvents = pastEventsResult.data ?? [];
  const allAttendance = attendanceResult.data ?? [];

  if (pastEvents.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-400 text-center">
        No past events yet.
      </div>
    );
  }

  // Build a per-event summary.
  const summaryMap = new Map<string, { total: number; present: number; absent: number }>();
  for (const row of allAttendance) {
    const current = summaryMap.get(row.event_id) ?? { total: 0, present: 0, absent: 0 };
    current.total += 1;
    if (row.status === 'present' || row.status === 'late') {
      current.present += 1;
    } else if (row.status === 'absent') {
      current.absent += 1;
    }
    summaryMap.set(row.event_id, current);
  }

  // Find the most recent event that has any attendance recorded at all.
  const recentWithAttendance = pastEvents.find(
    (e) => (summaryMap.get(e.id)?.total ?? 0) > 0,
  );

  if (!recentWithAttendance) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-400 text-center">
        No attendance has been taken yet.
      </div>
    );
  }

  const summary = summaryMap.get(recentWithAttendance.id) ?? { total: 0, present: 0, absent: 0 };

  return (
    <Link
      href={`/events/${recentWithAttendance.id}`}
      className="
        group flex items-start gap-3 rounded-xl
        border border-gray-200 bg-white px-4 py-3.5
        hover:shadow-md hover:border-green-200 hover:bg-green-50/30
        focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1
        transition-all duration-150
      "
    >
      {/* Activity icon */}
      <div
        className="mt-0.5 h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-green-100 text-green-700"
        aria-hidden="true"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Activity text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700">
          Last attendance taken for{' '}
          <span className="font-semibold text-gray-900 group-hover:text-green-800 transition-colors">
            {recentWithAttendance.title}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          {summary.present} present
          {summary.absent > 0 && `, ${summary.absent} absent`}
          {' · '}
          {formatDateTime(recentWithAttendance.event_date)}
        </p>
      </div>

      {/* Arrow */}
      <svg
        className="mt-1 h-4 w-4 shrink-0 text-gray-300 group-hover:text-green-600 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — shown via Suspense while async sections fetch
// ---------------------------------------------------------------------------

function StatsSkeleton() {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" aria-busy="true" aria-label="Loading stats">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5 animate-pulse">
          <div className="h-3 w-24 rounded bg-gray-200 mb-3" />
          <div className="h-8 w-12 rounded-lg bg-gray-200" />
        </div>
      ))}
    </dl>
  );
}

function UpcomingEventsSkeleton() {
  return (
    <ul className="space-y-2.5" aria-busy="true" aria-label="Loading upcoming events">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="rounded-xl border border-gray-100 bg-white px-4 py-3.5 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-16 rounded bg-gray-200" />
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-200" />
            </div>
            <div className="h-8 w-10 rounded bg-gray-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ActivitySkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3.5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-1/2 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          Welcome to the Caerphilly RFC admin portal.
        </p>
      </div>

      {/* Quick stats */}
      <section aria-label="Quick stats">
        <Suspense fallback={<StatsSkeleton />}>
          <QuickStats />
        </Suspense>
      </section>

      {/* Two-column layout on md+ screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Upcoming events */}
        <section aria-labelledby="upcoming-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="upcoming-heading" className="text-base font-semibold text-gray-900">
              Upcoming Events
            </h2>
            <Link
              href="/events"
              className="text-xs font-medium text-green-700 hover:text-green-900 hover:underline focus:outline-none focus:underline transition-colors"
            >
              View all
            </Link>
          </div>
          <Suspense fallback={<UpcomingEventsSkeleton />}>
            <UpcomingEvents />
          </Suspense>
        </section>

        {/* Recent activity */}
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="text-base font-semibold text-gray-900 mb-3">
            Recent Activity
          </h2>
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
