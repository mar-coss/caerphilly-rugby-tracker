/**
 * Unit tests for src/app/(dashboard)/events/actions.ts
 *
 * createEvent is more complex than the player/coach actions because it:
 * 1. Inserts the event record
 * 2. Fetches all active players
 * 3. Bulk-upserts attendance rows for each player
 *
 * We need a mock that returns different results for successive .from() calls.
 * The approach is: configure an ordered queue of results, and each time the
 * proxy resolves (is awaited) it dequeues the next result.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { validEventFormData } from '@/tests/form-data-builder';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set:    vi.fn(),
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  createEvent,
  deleteEvent,
  updateAttendanceStatus,
} from '@/app/(dashboard)/events/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Multi-call Supabase mock
//
// createEvent makes 3 awaited calls (event insert, player fetch, attendance
// upsert). Each time the proxy is awaited we return the next result in the
// queue. This gives tests fine-grained control over each DB interaction.
// ---------------------------------------------------------------------------

type QueryResult = { data: unknown; error: { message: string; code: string } | null };

function createSequentialSupabaseMock(results: QueryResult[]) {
  let callIndex = 0;

  const getResult = () => {
    const result = results[callIndex] ?? { data: null, error: null };
    callIndex += 1;
    return result;
  };

  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: QueryResult) => void) => resolve(getResult());
      }
      if (prop === 'catch') {
        return () => proxy;
      }
      return vi.fn().mockReturnValue(proxy);
    },
  };

  const proxy = new Proxy({}, handler);

  return {
    from: vi.fn().mockReturnValue(proxy),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EVENT_ROW = {
  id:           'event-uuid-1',
  created_at:   '2024-09-10T00:00:00Z',
  updated_at:   '2024-09-10T00:00:00Z',
  title:        'Tuesday Training',
  event_type:   'training',
  event_date:   '2024-09-10T18:00:00Z',
  location:     'Caerphilly RFC Ground',
  notes:        null,
  is_cancelled: false,
};

const ACTIVE_PLAYERS = [
  { id: 'player-1' },
  { id: 'player-2' },
  { id: 'player-3' },
];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------

describe('createEvent', () => {
  test('returns success with event data and attendance counts on happy path', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: EVENT_ROW,      error: null }, // event insert
      { data: ACTIVE_PLAYERS, error: null }, // player fetch
      { data: null,           error: null }, // attendance upsert
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await createEvent(validEventFormData());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Tuesday Training');
      expect(result.data.event_type).toBe('training');
      expect(result.data.attendance_count).toBe(3);
      expect(result.data.present_count).toBe(0);
      expect(result.data.absent_count).toBe(3);
    }
  });

  test('calls revalidatePath("/events") and revalidatePath("/") on success', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: EVENT_ROW,      error: null },
      { data: ACTIVE_PLAYERS, error: null },
      { data: null,           error: null },
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    await createEvent(validEventFormData());

    expect(revalidatePath).toHaveBeenCalledWith('/events');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  test('returns validation error when title is missing', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await createEvent(validEventFormData({ title: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.title).toBe('Event title is required.');
    }
  });

  test('returns validation error when event_type is invalid', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await createEvent(validEventFormData({ event_type: 'tournament' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.event_type).toMatch(/valid event type/i);
    }
  });

  test('returns validation error when event_date is missing', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await createEvent(validEventFormData({ event_date: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.event_date).toMatch(/required/i);
    }
  });

  test('returns validation error when event_date is not a valid date', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await createEvent(validEventFormData({ event_date: 'not-a-date' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.event_date).toMatch(/valid date/i);
    }
  });

  test('returns DB error when event insert fails', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: null, error: { message: 'permission denied', code: '42501' } },
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await createEvent(validEventFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('permission denied');
    }
  });

  test('still succeeds even when the active player fetch fails (event is created)', async () => {
    // The action logs but does NOT fail when player fetch errors — the event
    // record already exists at this point and is the higher priority.
    const mockClient = createSequentialSupabaseMock([
      { data: EVENT_ROW, error: null },
      { data: null, error: { message: 'timeout', code: '08P01' } }, // player fetch fails
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await createEvent(validEventFormData());

    expect(result.success).toBe(true);
    if (result.success) {
      // No attendance rows because player fetch failed
      expect(result.data.attendance_count).toBe(0);
    }
  });

  test('still succeeds when attendance upsert fails (event is already saved)', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: EVENT_ROW,      error: null },
      { data: ACTIVE_PLAYERS, error: null },
      { data: null, error: { message: 'upsert failed', code: '23000' } },
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await createEvent(validEventFormData());

    // Event creation is considered successful even if attendance seeding fails.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Tuesday Training');
    }
  });

  test('zero active players results in zero attendance counts', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: EVENT_ROW, error: null },
      { data: [],        error: null }, // no active players
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await createEvent(validEventFormData());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attendance_count).toBe(0);
      expect(result.data.absent_count).toBe(0);
    }
  });

  test('allows all valid event types', async () => {
    const eventTypes = ['training', 'match', 'meeting', 'other'] as const;

    for (const event_type of eventTypes) {
      vi.clearAllMocks();
      const mockClient = createSequentialSupabaseMock([
        { data: { ...EVENT_ROW, event_type }, error: null },
        { data: [], error: null },
      ]);
      vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

      const result = await createEvent(validEventFormData({ event_type }));
      expect(result.success).toBe(true);
    }
  });

  test('does not call revalidatePath when validation fails', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    await createEvent(validEventFormData({ title: '' }));

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------

describe('deleteEvent', () => {
  test('returns success with the deleted event id', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: null, error: null },
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await deleteEvent('event-uuid-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('event-uuid-1');
    }
  });

  test('returns an error when eventId is empty', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await deleteEvent('');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Event ID is required/i);
    }
  });

  test('calls revalidatePath("/events") and revalidatePath("/") on success', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: null, error: null },
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    await deleteEvent('event-uuid-1');

    expect(revalidatePath).toHaveBeenCalledWith('/events');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  test('returns DB error when delete fails', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: null, error: { message: 'row lock timeout', code: '55P03' } },
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await deleteEvent('event-uuid-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('row lock timeout');
    }
  });
});

// ---------------------------------------------------------------------------
// updateAttendanceStatus
// ---------------------------------------------------------------------------

describe('updateAttendanceStatus', () => {
  const ATTENDANCE_RESULT = { id: 'att-uuid-1', status: 'present' };

  test('returns success with the updated attendance record', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: ATTENDANCE_RESULT, error: null },
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await updateAttendanceStatus('att-uuid-1', 'event-uuid-1', 'present');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('att-uuid-1');
      expect(result.data.status).toBe('present');
    }
  });

  test('revalidates the event detail page and events list on success', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: ATTENDANCE_RESULT, error: null },
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    await updateAttendanceStatus('att-uuid-1', 'event-uuid-1', 'present');

    expect(revalidatePath).toHaveBeenCalledWith('/events/event-uuid-1');
    expect(revalidatePath).toHaveBeenCalledWith('/events');
  });

  test('returns an error when attendanceId is empty', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await updateAttendanceStatus('', 'event-uuid-1', 'present');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Attendance ID is required/i);
    }
  });

  test('returns an error when eventId is empty', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await updateAttendanceStatus('att-uuid-1', '', 'present');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Event ID is required/i);
    }
  });

  test('returns an error for an invalid attendance status', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    // TypeScript would catch this at compile time; we cast to test runtime validation.
    const result = await updateAttendanceStatus(
      'att-uuid-1',
      'event-uuid-1',
      'on_strike' as never,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/not a valid attendance status/i);
    }
  });

  test('allows all valid attendance status values', async () => {
    const statuses = ['present', 'absent', 'late', 'injured', 'excused'] as const;

    for (const status of statuses) {
      vi.clearAllMocks();
      const mockClient = createSequentialSupabaseMock([
        { data: { id: 'att-uuid-1', status }, error: null },
      ]);
      vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

      const result = await updateAttendanceStatus('att-uuid-1', 'event-uuid-1', status);
      expect(result.success).toBe(true);
    }
  });

  test('returns a DB error message when the update fails', async () => {
    const mockClient = createSequentialSupabaseMock([
      { data: null, error: { message: 'record not found', code: 'PGRST116' } },
    ]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    const result = await updateAttendanceStatus('att-uuid-1', 'event-uuid-1', 'present');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('record not found');
    }
  });

  test('does not call revalidatePath when validation fails (invalid status)', async () => {
    const mockClient = createSequentialSupabaseMock([]);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockClient as never);

    await updateAttendanceStatus('att-uuid-1', 'event-uuid-1', 'bad_status' as never);

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
