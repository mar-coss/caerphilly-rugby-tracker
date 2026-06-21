/**
 * Unit tests for src/app/(dashboard)/coaches/actions.ts
 *
 * Same mocking strategy as players.actions.test.ts:
 * - createSupabaseServerClient returns a chainable in-memory mock
 * - next/cache and next/headers are stubbed out
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/tests/supabase-mock';
import { validCoachFormData } from '@/tests/form-data-builder';

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
  createCoach,
  updateCoach,
  deactivateCoach,
} from '@/app/(dashboard)/coaches/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COACH_ROW = {
  id:         'coach-uuid-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  first_name: 'Warren',
  last_name:  'Gatland',
  role:       'Head Coach',
  email:      null,
  phone:      null,
  notes:      null,
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let mockSupabase: ReturnType<typeof createSupabaseMock>['mockSupabase'];
let setQueryResult: ReturnType<typeof createSupabaseMock>['setQueryResult'];

beforeEach(() => {
  vi.clearAllMocks();
  const mock = createSupabaseMock();
  mockSupabase = mock.mockSupabase;
  setQueryResult = mock.setQueryResult;
  vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as never);
});

// ---------------------------------------------------------------------------
// createCoach
// ---------------------------------------------------------------------------

describe('createCoach', () => {
  test('returns success with the new coach on a valid insert', async () => {
    setQueryResult({ data: COACH_ROW, error: null });

    const result = await createCoach(validCoachFormData());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBe('Warren');
      expect(result.data.last_name).toBe('Gatland');
      expect(result.data.full_name).toBe('Warren Gatland');
      expect(result.data.role).toBe('Head Coach');
    }
  });

  test('calls revalidatePath("/coaches") and revalidatePath("/") on success', async () => {
    setQueryResult({ data: COACH_ROW, error: null });

    await createCoach(validCoachFormData());

    expect(revalidatePath).toHaveBeenCalledWith('/coaches');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  test('returns validation error when first_name is missing', async () => {
    const result = await createCoach(validCoachFormData({ first_name: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.first_name).toBe('First name is required.');
    }
  });

  test('returns validation error when last_name is missing', async () => {
    const result = await createCoach(validCoachFormData({ last_name: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.last_name).toBe('Last name is required.');
    }
  });

  test('returns validation error when role is missing', async () => {
    const result = await createCoach(validCoachFormData({ role: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.role).toBe('Role is required.');
    }
  });

  test('returns validation error for an invalid role value', async () => {
    const result = await createCoach(validCoachFormData({ role: 'Waterboy' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.role).toMatch(/valid role/i);
    }
  });

  test('returns validation error for a malformed email address', async () => {
    const result = await createCoach(validCoachFormData({ email: 'bad-email' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.email).toMatch(/valid email/i);
    }
  });

  test('accepts a valid email address', async () => {
    setQueryResult({ data: COACH_ROW, error: null });

    const result = await createCoach(
      validCoachFormData({ email: 'warren@caerphilly.rfc' }),
    );
    expect(result.success).toBe(true);
  });

  test('returns a DB error message when insert fails', async () => {
    setQueryResult({
      data: null,
      error: { message: 'database is read-only', code: '25006' },
    });

    const result = await createCoach(validCoachFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('database is read-only');
    }
  });

  test('does not call revalidatePath when validation fails', async () => {
    await createCoach(validCoachFormData({ first_name: '' }));
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('allows all valid coach roles', async () => {
    const roles = [
      'Assistant Coach',
      'Forwards Coach',
      'Backs Coach',
      'Strength & Conditioning',
      'Team Manager',
    ] as const;

    for (const role of roles) {
      setQueryResult({ data: { ...COACH_ROW, role }, error: null });
      const result = await createCoach(validCoachFormData({ role }));
      expect(result.success).toBe(true);
    }
  });

  test('whitespace-only first_name is treated as missing', async () => {
    const result = await createCoach(validCoachFormData({ first_name: '   ' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.first_name).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// updateCoach
// ---------------------------------------------------------------------------

describe('updateCoach', () => {
  test('returns success with the updated coach', async () => {
    const updated = { ...COACH_ROW, role: 'Assistant Coach' };
    setQueryResult({ data: updated, error: null });

    const result = await updateCoach(
      'coach-uuid-1',
      validCoachFormData({ role: 'Assistant Coach' }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('Assistant Coach');
      expect(result.data.full_name).toBe('Warren Gatland');
    }
  });

  test('returns an error when coachId is empty', async () => {
    const result = await updateCoach('', validCoachFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Coach ID is required/i);
    }
  });

  test('returns validation errors when required fields are missing', async () => {
    const result = await updateCoach(
      'coach-uuid-1',
      validCoachFormData({ first_name: '', role: '' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.first_name).toBeDefined();
      expect(errors.role).toBeDefined();
    }
  });

  test('propagates DB error messages', async () => {
    setQueryResult({
      data: null,
      error: { message: 'row not found', code: 'PGRST116' },
    });

    const result = await updateCoach('coach-uuid-1', validCoachFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('row not found');
    }
  });

  test('calls revalidatePath on success', async () => {
    setQueryResult({ data: COACH_ROW, error: null });

    await updateCoach('coach-uuid-1', validCoachFormData());

    expect(revalidatePath).toHaveBeenCalledWith('/coaches');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });
});

// ---------------------------------------------------------------------------
// deactivateCoach (hard delete — coaches have no status column)
// ---------------------------------------------------------------------------

describe('deactivateCoach', () => {
  test('returns success with the deleted coach id', async () => {
    // delete() chain resolves with no data (void), just an error field.
    setQueryResult({ data: null, error: null });

    const result = await deactivateCoach('coach-uuid-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('coach-uuid-1');
    }
  });

  test('returns an error when coachId is empty', async () => {
    const result = await deactivateCoach('');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Coach ID is required/i);
    }
  });

  test('calls revalidatePath on success', async () => {
    setQueryResult({ data: null, error: null });

    await deactivateCoach('coach-uuid-1');

    expect(revalidatePath).toHaveBeenCalledWith('/coaches');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  test('returns a DB error when delete fails', async () => {
    setQueryResult({
      data: null,
      error: { message: 'foreign key violation', code: '23503' },
    });

    const result = await deactivateCoach('coach-uuid-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('foreign key violation');
    }
  });

  test('does not call revalidatePath when the DB returns an error', async () => {
    setQueryResult({
      data: null,
      error: { message: 'foreign key violation', code: '23503' },
    });

    await deactivateCoach('coach-uuid-1');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
