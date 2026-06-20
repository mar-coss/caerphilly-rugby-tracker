import type { Metadata } from 'next';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EventTypeBadge } from '@/components/features/events/EventTypeBadge';
import { formatDateTime } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Attendance — Caerphilly RFC',
};

/**
 * Attendance summary page.
 *
 * Shows a list of recent past events with their attendance outcomes,
 * linking through to the full register on the event detail page.
 *
 * This is an intentionally lightweight page — the canonical "take attendance"
 * flow is through Events → Event detail → Attendance Register. This page
 * gives the admin a quick at-a-glance historical view.
 */
export default async function AttendancePage() {
  const supabase = await createSupabaseServerClient();

  const [eventsResult, attendanceResult] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .lt('event_date', new Date().toISOString())
      .eq('is_cancelled', false)
      .order('event_date', { ascending: false })
      .limit(20),
    supabase
      .from('attendance')
      .select('event_id, status'),
  ]);

  const pastEvents = eventsResult.data ?? [];
  const allAttendance = attendanceResult.data ?? [];

  // Build per-event attendance summary.
  const summaryMap = new Map<string, { total: number; present: number; absent: number; excused: number }>();
  for (const row of allAttendance) {
    const current = summaryMap.get(row.event_id) ?? { total: 0, present: 0, absent: 0, excused: 0 };
    current.total += 1;
    if (row.status === 'present' || row.status === 'late') current.present += 1;
    else if (row.status === 'absent') current.absent += 1;
    else current.excused += 1;
    summaryMap.set(row.event_id, current);
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Recent event attendance history. Open an event to update the register.
          </p>
        </div>
        <Link
          href="/events"
          className="
            shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-green-700
            hover:bg-green-800
            focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
            transition-colors duration-150
          "
        >
          All Events
        </Link>
      </div>

      {/* Past events list */}
      {pastEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-gray-900">No past events yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Past events will appear here once they have been created and their date has passed.
          </p>
          <Link
            href="/events"
            className="
              mt-6 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white
              hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
              transition-colors duration-150
            "
          >
            Go to Events
          </Link>
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {pastEvents.map((event) => {
            const summary = summaryMap.get(event.id) ?? { total: 0, present: 0, absent: 0, excused: 0 };
            const attendanceTaken = summary.total > 0;
            const attendanceRate =
              attendanceTaken && summary.total > 0
                ? Math.round((summary.present / summary.total) * 100)
                : null;

            return (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}`}
                  className="
                    group flex items-start justify-between gap-3
                    rounded-xl border border-gray-200 bg-white px-4 py-4 sm:px-5
                    hover:shadow-md hover:border-green-200 hover:bg-green-50/30
                    focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1
                    transition-all duration-150
                  "
                >
                  {/* Left: event info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <EventTypeBadge type={event.event_type} />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-green-800 transition-colors truncate">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDateTime(event.event_date)}
                      {event.location && (
                        <span className="text-gray-400"> · {event.location}</span>
                      )}
                    </p>
                  </div>

                  {/* Right: attendance outcome */}
                  <div className="shrink-0 text-right">
                    {attendanceTaken ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 tabular-nums">
                          {summary.present}
                          <span className="font-normal text-gray-400">/{summary.total}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {attendanceRate !== null ? `${attendanceRate}% present` : 'present'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No register taken</p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
