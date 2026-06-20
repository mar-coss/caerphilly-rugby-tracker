import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EventList } from '@/components/features/events/EventList';
import { AddEventButton } from '@/components/features/events/AddEventButton';
import type { EventWithAttendanceSummary } from '@/types';

export const metadata: Metadata = {
  title: 'Events — Caerphilly RFC',
};

/**
 * Events list page.
 *
 * Server component — fetches all events with attendance summary counts and
 * passes them to the interactive EventList client component. The page header
 * contains the AddEventButton client island so the rest of the page stays
 * server-rendered.
 *
 * Events are sorted by date descending (most recent / upcoming first) so
 * upcoming fixtures appear at the top of the list.
 */
export default async function EventsPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch events and their attendance rows in parallel.
  const [eventsResult, attendanceResult] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false }),
    supabase
      .from('attendance')
      .select('event_id, status'),
  ]);

  if (eventsResult.error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Events</h1>
        <div
          role="alert"
          className="mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          Failed to load events. Please try refreshing the page.
        </div>
      </div>
    );
  }

  // Build a per-event attendance summary from the flat attendance rows.
  const summaryMap = new Map<string, { total: number; present: number }>();
  for (const row of attendanceResult.data ?? []) {
    const current = summaryMap.get(row.event_id) ?? { total: 0, present: 0 };
    current.total += 1;
    if (row.status === 'present' || row.status === 'late') {
      current.present += 1;
    }
    summaryMap.set(row.event_id, current);
  }

  const events: EventWithAttendanceSummary[] = (eventsResult.data ?? []).map((event) => {
    const summary = summaryMap.get(event.id) ?? { total: 0, present: 0 };
    return {
      ...event,
      attendance_count: summary.total,
      present_count:    summary.present,
      absent_count:     summary.total - summary.present,
    };
  });

  const upcomingCount = events.filter(
    (e) => !e.is_cancelled && new Date(e.event_date) >= new Date(),
  ).length;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            {upcomingCount > 0 && (
              <>{upcomingCount} upcoming · </>
            )}
            {events.length} total
          </p>
        </div>
        <AddEventButton />
      </div>

      {/* Event list */}
      <EventList events={events} />
    </div>
  );
}
