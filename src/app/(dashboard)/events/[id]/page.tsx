import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { EventTypeBadge } from '@/components/features/events/EventTypeBadge';
import { EventAttendanceRegister } from '@/components/features/events/EventAttendanceRegister';
import { formatDateTime } from '@/lib/utils';
import type { AttendanceWithPlayer } from '@/types';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/**
 * Dynamic metadata: use the event title in the browser tab.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('events')
    .select('title')
    .eq('id', id)
    .single();

  return {
    title: data?.title
      ? `${data.title} — Caerphilly RFC`
      : 'Event — Caerphilly RFC',
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Event detail page.
 *
 * Server component — fetches the event and all its attendance records with
 * player / coach data joined, then hands them to the interactive
 * EventAttendanceRegister client component.
 *
 * Data boundary:
 * - Event header (title, date, location, type) — server-rendered, static
 * - Attendance table + summary stats — client-rendered, optimistic updates
 *
 * The summary stats that previously lived in the server-rendered header are
 * now computed inside EventAttendanceRegister so they update immediately when
 * a coach marks a player present without waiting for a round-trip to the server.
 */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Fetch event and attendance rows in parallel.
  const [eventResult, attendanceResult] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('attendance')
      .select(`
        *,
        player:players(*),
        coach:coaches(*)
      `)
      .eq('event_id', id),
  ]);

  // PGRST116 = "no rows returned" — event does not exist.
  if (eventResult.error?.code === 'PGRST116') {
    notFound();
  }

  if (eventResult.error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Event</h1>
        <div
          role="alert"
          className="mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          Failed to load event. Please try refreshing the page.
        </div>
      </div>
    );
  }

  const event = eventResult.data;
  const attendances = (attendanceResult.data ?? []) as AttendanceWithPlayer[];

  return (
    <div>
      {/* Back link */}
      <Link
        href="/events"
        className="
          inline-flex items-center gap-1.5 text-sm text-gray-500
          hover:text-gray-700 focus:outline-none focus:underline
          mb-6 transition-colors duration-100
        "
      >
        <span aria-hidden="true">←</span>
        Back to events
      </Link>

      {/* Event header — server-rendered, static */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-4 sm:px-6 sm:py-5 mb-6">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <EventTypeBadge type={event.event_type} />
          {event.is_cancelled && (
            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              Cancelled
            </span>
          )}
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
          {event.title}
        </h1>

        {/* Date and location */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>{formatDateTime(event.event_date)}</span>
          {event.location && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">·</span>
              {event.location}
            </span>
          )}
        </div>

        {/* Notes */}
        {event.notes && (
          <p className="mt-3 text-sm text-gray-600 max-w-prose">{event.notes}</p>
        )}
      </div>

      {/* Attendance register — interactive client component */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Attendance Register</h2>

        <EventAttendanceRegister eventId={event.id} attendances={attendances} />
      </div>
    </div>
  );
}
