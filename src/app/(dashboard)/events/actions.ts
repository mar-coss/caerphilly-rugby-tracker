'use server';

/**
 * Server Actions for event management.
 *
 * Responsibilities:
 * - Validate all input server-side before touching the database
 * - Create events and auto-populate attendance rows for every active player
 * - Delete events (attendance cascades via the FK constraint)
 * - Fetch events with attendance summary counts for the list view
 * - Fetch a single event with its full attendance sheet for the detail view
 * - Return typed ActionResult envelopes so callers handle success/error uniformly
 * - Call revalidatePath so the Next.js cache is invalidated after mutations
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getErrorMessage, logError } from '@/lib/utils';
import type { ActionResult, EventWithAttendanceSummary, EventAttendanceSheet } from '@/types';
import type { EventInsert, EventType, AttendanceInsert, AttendanceStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_EVENT_TYPES: EventType[] = ['training', 'match', 'meeting', 'other'];

const VALID_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'present',
  'absent',
  'late',
  'injured',
  'excused',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventFormData {
  title: string;
  event_type: string;
  event_date: string;
  location: string;
  notes: string;
}

interface EventValidationErrors {
  title?: string;
  event_type?: string;
  event_date?: string;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function extractEventFormData(formData: FormData): EventFormData {
  return {
    title:      String(formData.get('title') ?? '').trim(),
    event_type: String(formData.get('event_type') ?? '').trim(),
    event_date: String(formData.get('event_date') ?? '').trim(),
    location:   String(formData.get('location') ?? '').trim(),
    notes:      String(formData.get('notes') ?? '').trim(),
  };
}

function validateEventForm(data: EventFormData): EventValidationErrors {
  const errors: EventValidationErrors = {};

  if (!data.title) {
    errors.title = 'Event title is required.';
  }

  if (!data.event_type || !VALID_EVENT_TYPES.includes(data.event_type as EventType)) {
    errors.event_type = 'Please select a valid event type.';
  }

  if (!data.event_date) {
    errors.event_date = 'Event date and time is required.';
  } else {
    const parsed = new Date(data.event_date);
    if (isNaN(parsed.getTime())) {
      errors.event_date = 'Please enter a valid date and time.';
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Creates a new event and auto-populates attendance rows for all active players.
 *
 * The attendance rows are inserted with status 'absent' as the default.
 * We use upsert with ignoreDuplicates so this is idempotent — running it
 * twice will not fail due to the unique constraint on (event_id, player_id).
 *
 * The event row is inserted first; if that fails, no attendance rows are written.
 * If the attendance bulk-insert fails, the event still exists — this is
 * acceptable because attendance rows can be created retroactively, and it is
 * far less disruptive than rolling back the event creation.
 */
export async function createEvent(
  formData: FormData,
): Promise<ActionResult<EventWithAttendanceSummary>> {
  const raw = extractEventFormData(formData);
  const errors = validateEventForm(raw);

  if (Object.keys(errors).length > 0) {
    return { success: false, error: JSON.stringify(errors) };
  }

  try {
    const supabase = await createSupabaseServerClient();

    // 1. Insert the event record.
    const insert: EventInsert = {
      title:        raw.title,
      event_type:   raw.event_type as EventType,
      event_date:   new Date(raw.event_date).toISOString(),
      location:     raw.location || null,
      notes:        raw.notes || null,
      is_cancelled: false,
    };

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert(insert)
      .select()
      .single();

    if (eventError) {
      logError('createEvent:insert', eventError);
      return { success: false, error: getErrorMessage(eventError) };
    }

    // 2. Fetch all active players to create default attendance rows.
    const { data: activePlayers, error: playersError } = await supabase
      .from('players')
      .select('id')
      .eq('status', 'active');

    if (playersError) {
      // Log but don't fail — the event exists and attendance can be added later.
      logError('createEvent:fetchPlayers', playersError);
    }

    // 3. Bulk-insert one attendance row per active player with status 'absent'.
    if (activePlayers && activePlayers.length > 0) {
      const attendanceRows: AttendanceInsert[] = activePlayers.map((player) => ({
        event_id:  eventData.id,
        player_id: player.id,
        coach_id:  null,
        status:    'absent',
        notes:     null,
      }));

      const { error: attendanceError } = await supabase
        .from('attendance')
        .upsert(attendanceRows, {
          onConflict: 'event_id,player_id',
          ignoreDuplicates: true,
        });

      if (attendanceError) {
        // Log but don't fail — the event is created successfully.
        logError('createEvent:upsertAttendance', attendanceError);
      }
    }

    revalidatePath('/events');
    revalidatePath('/');

    return {
      success: true,
      data: {
        ...eventData,
        attendance_count: activePlayers?.length ?? 0,
        present_count:    0,
        absent_count:     activePlayers?.length ?? 0,
      },
    };
  } catch (caught) {
    logError('createEvent', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Deletes an event by ID.
 *
 * Attendance records are removed automatically by the database via the
 * ON DELETE CASCADE foreign key constraint on attendance.event_id.
 */
export async function deleteEvent(
  eventId: string,
): Promise<ActionResult<{ id: string }>> {
  if (!eventId) {
    return { success: false, error: 'Event ID is required.' };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      logError('deleteEvent', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/events');
    revalidatePath('/');

    return { success: true, data: { id: eventId } };
  } catch (caught) {
    logError('deleteEvent', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Fetches all events with attendance summary counts, sorted by event_date
 * descending (most recent / upcoming first).
 *
 * The attendance summary (present_count, absent_count) is computed by
 * fetching the attendance rows separately and aggregating in application code.
 * This avoids complex SQL aggregate queries while remaining performant for
 * the expected data volumes of a club-sized roster.
 */
export async function getEvents(): Promise<ActionResult<EventWithAttendanceSummary[]>> {
  try {
    const supabase = await createSupabaseServerClient();

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
      logError('getEvents:events', eventsResult.error);
      return { success: false, error: getErrorMessage(eventsResult.error) };
    }

    if (attendanceResult.error) {
      logError('getEvents:attendance', attendanceResult.error);
      return { success: false, error: getErrorMessage(attendanceResult.error) };
    }

    // Build a lookup map: eventId -> { total, present }
    const summaryMap = new Map<string, { total: number; present: number }>();
    for (const row of attendanceResult.data) {
      const current = summaryMap.get(row.event_id) ?? { total: 0, present: 0 };
      current.total += 1;
      if (row.status === 'present' || row.status === 'late') {
        current.present += 1;
      }
      summaryMap.set(row.event_id, current);
    }

    const events: EventWithAttendanceSummary[] = eventsResult.data.map((event) => {
      const summary = summaryMap.get(event.id) ?? { total: 0, present: 0 };
      return {
        ...event,
        attendance_count: summary.total,
        present_count:    summary.present,
        absent_count:     summary.total - summary.present,
      };
    });

    return { success: true, data: events };
  } catch (caught) {
    logError('getEvents', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Fetches a single event with its full attendance sheet (each attendance row
 * joined to the related player record).
 *
 * Returns null data (not an error) when the event does not exist, so the
 * detail page can render a 404-style state rather than a hard error.
 */
export async function getEventWithAttendance(
  eventId: string,
): Promise<ActionResult<EventAttendanceSheet | null>> {
  if (!eventId) {
    return { success: false, error: 'Event ID is required.' };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const [eventResult, attendanceResult] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single(),
      supabase
        .from('attendance')
        .select(`
          *,
          player:players(*),
          coach:coaches(*)
        `)
        .eq('event_id', eventId)
        .order('status', { ascending: true }),
    ]);

    // Event not found — not a hard error, caller decides how to render.
    if (eventResult.error?.code === 'PGRST116') {
      return { success: true, data: null };
    }

    if (eventResult.error) {
      logError('getEventWithAttendance:event', eventResult.error);
      return { success: false, error: getErrorMessage(eventResult.error) };
    }

    if (attendanceResult.error) {
      logError('getEventWithAttendance:attendance', attendanceResult.error);
      return { success: false, error: getErrorMessage(attendanceResult.error) };
    }

    return {
      success: true,
      data: {
        event:       eventResult.data,
        attendances: attendanceResult.data,
      },
    };
  } catch (caught) {
    logError('getEventWithAttendance', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Updates the attendance status for a single attendance record.
 *
 * Validates that the requested status is a member of the AttendanceStatus
 * enum before touching the database. Returns the updated record so the
 * caller can confirm the persisted value.
 *
 * Revalidates the event detail page so any server-rendered sibling
 * components (e.g. metadata) reflect the change on the next navigation.
 */
export async function updateAttendanceStatus(
  attendanceId: string,
  eventId: string,
  newStatus: AttendanceStatus,
): Promise<ActionResult<{ id: string; status: AttendanceStatus }>> {
  if (!attendanceId) {
    return { success: false, error: 'Attendance ID is required.' };
  }

  if (!eventId) {
    return { success: false, error: 'Event ID is required.' };
  }

  if (!VALID_ATTENDANCE_STATUSES.includes(newStatus)) {
    return { success: false, error: `"${newStatus}" is not a valid attendance status.` };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('attendance')
      .update({ status: newStatus })
      .eq('id', attendanceId)
      .select('id, status')
      .single();

    if (error) {
      logError('updateAttendanceStatus', error);
      return { success: false, error: getErrorMessage(error) };
    }

    // Revalidate the event detail page so the server cache reflects the update.
    revalidatePath(`/events/${eventId}`);
    // Revalidate the events list so per-event attendance counts stay accurate.
    revalidatePath('/events');

    return { success: true, data: { id: data.id, status: data.status as AttendanceStatus } };
  } catch (caught) {
    logError('updateAttendanceStatus', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}
