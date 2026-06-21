/**
 * Unit tests for src/app/(dashboard)/players/actions.ts
 *
 * Strategy:
 * - Mock createSupabaseServerClient to return a chainable in-memory mock.
 * - Mock next/cache revalidatePath to prevent Next.js runtime errors.
 * - Mock next/headers (pulled in transitively by server.ts) to avoid the
 *   "cookies() was called outside a request scope" error.
 * - Each test controls the mock's return value via setQueryResult().
 *
 * We test the happy path, all validation branches, and DB error propagation.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/tests/supabase-mock';
import {
  validPlayerFormData,
  buildFormData,
} from '@/tests/form-data-builder';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before importing the module under test.
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

// We mock the entire supabase/server module so createSupabaseServerClient
// returns our controlled mock. The mock factory is created per-test in
// beforeEach so mocks don't bleed between tests.
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are declared.
// ---------------------------------------------------------------------------

import {
  createPlayer,
  updatePlayer,
  deactivatePlayer,
  reactivatePlayer,
} from '@/app/(dashboard)/players/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PLAYER_ROW = {
  id:            'player-uuid-1',
  created_at:    '2024-01-01T00:00:00Z',
  updated_at:    '2024-01-01T00:00:00Z',
  first_name:    'Gethin',
  last_name:     'Jenkins',
  position:      'Loosehead Prop',
  squad_number:  1,
  status:        'active',
  date_of_birth: null,
  email:         null,
  phone:         null,
  notes:         null,
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
// createPlayer
// ---------------------------------------------------------------------------

describe('createPlayer', () => {
  test('returns success with the new player when the DB insert succeeds', async () => {
    setQueryResult({ data: PLAYER_ROW, error: null });

    const result = await createPlayer(validPlayerFormData());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBe('Gethin');
      expect(result.data.last_name).toBe('Jenkins');
      // full_name is computed client-side by the action
      expect(result.data.full_name).toBe('Gethin Jenkins');
    }
  });

  test('calls revalidatePath("/players") and revalidatePath("/") on success', async () => {
    setQueryResult({ data: PLAYER_ROW, error: null });

    await createPlayer(validPlayerFormData());

    expect(revalidatePath).toHaveBeenCalledWith('/players');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  test('returns validation error when first_name is missing', async () => {
    const result = await createPlayer(validPlayerFormData({ first_name: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.first_name).toBe('First name is required.');
    }
  });

  test('returns validation error when last_name is missing', async () => {
    const result = await createPlayer(validPlayerFormData({ last_name: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.last_name).toBe('Last name is required.');
    }
  });

  test('returns validation error for an invalid position value', async () => {
    const result = await createPlayer(
      validPlayerFormData({ position: 'Quarterback' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.position).toMatch(/valid position/i);
    }
  });

  test('returns validation error for squad number outside 1-99 range', async () => {
    const result = await createPlayer(
      validPlayerFormData({ squad_number: '100' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.squad_number).toMatch(/between 1 and 99/i);
    }
  });

  test('returns validation error for squad number 0', async () => {
    const result = await createPlayer(
      validPlayerFormData({ squad_number: '0' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.squad_number).toMatch(/between 1 and 99/i);
    }
  });

  test('returns validation error for a non-integer squad number', async () => {
    const result = await createPlayer(
      validPlayerFormData({ squad_number: '7.5' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.squad_number).toMatch(/between 1 and 99/i);
    }
  });

  test('accepts a valid email address', async () => {
    setQueryResult({ data: PLAYER_ROW, error: null });
    const result = await createPlayer(
      validPlayerFormData({ email: 'gethin@caerphilly.rfc' }),
    );
    expect(result.success).toBe(true);
  });

  test('returns validation error for a malformed email address', async () => {
    const result = await createPlayer(
      validPlayerFormData({ email: 'not-an-email' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.email).toMatch(/valid email/i);
    }
  });

  test('returns the squad number conflict error for DB code 23505', async () => {
    setQueryResult({
      data: null,
      error: {
        message: 'duplicate key value violates unique constraint',
        code: '23505',
      },
    });

    const result = await createPlayer(validPlayerFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.squad_number).toMatch(/already taken/i);
    }
  });

  test('returns a generic error string for non-unique-violation DB errors', async () => {
    setQueryResult({
      data: null,
      error: { message: 'connection refused', code: '08001' },
    });

    const result = await createPlayer(validPlayerFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('connection refused');
    }
  });

  test('does not call revalidatePath when validation fails', async () => {
    await createPlayer(validPlayerFormData({ first_name: '' }));
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test('accepts an empty optional squad_number (no squad number assigned)', async () => {
    setQueryResult({
      data: { ...PLAYER_ROW, squad_number: null },
      error: null,
    });
    const result = await createPlayer(validPlayerFormData({ squad_number: '' }));
    expect(result.success).toBe(true);
  });

  test('allows all valid player positions', async () => {
    const positions = [
      'Hooker', 'Tighthead Prop', 'Lock', 'Blindside Flanker',
      'Openside Flanker', 'Number 8', 'Scrum Half', 'Fly Half',
      'Left Wing', 'Inside Centre', 'Outside Centre', 'Right Wing', 'Fullback',
    ] as const;

    for (const position of positions) {
      setQueryResult({ data: { ...PLAYER_ROW, position }, error: null });
      const result = await createPlayer(validPlayerFormData({ position }));
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// updatePlayer
// ---------------------------------------------------------------------------

describe('updatePlayer', () => {
  test('returns success with the updated player', async () => {
    const updated = { ...PLAYER_ROW, squad_number: 10 };
    setQueryResult({ data: updated, error: null });

    const result = await updatePlayer('player-uuid-1', validPlayerFormData({ squad_number: '10' }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.squad_number).toBe(10);
      expect(result.data.full_name).toBe('Gethin Jenkins');
    }
  });

  test('returns an error when playerId is empty', async () => {
    const result = await updatePlayer('', validPlayerFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Player ID is required/i);
    }
  });

  test('returns validation errors when required fields are missing', async () => {
    const result = await updatePlayer(
      'player-uuid-1',
      validPlayerFormData({ first_name: '', last_name: '' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.first_name).toBeDefined();
      expect(errors.last_name).toBeDefined();
    }
  });

  test('returns squad number conflict error for DB code 23505', async () => {
    setQueryResult({
      data: null,
      error: { message: 'unique constraint', code: '23505' },
    });

    const result = await updatePlayer('player-uuid-1', validPlayerFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.squad_number).toMatch(/already taken/i);
    }
  });

  test('calls revalidatePath on success', async () => {
    setQueryResult({ data: PLAYER_ROW, error: null });

    await updatePlayer('player-uuid-1', validPlayerFormData());

    expect(revalidatePath).toHaveBeenCalledWith('/players');
  });
});

// ---------------------------------------------------------------------------
// deactivatePlayer
// ---------------------------------------------------------------------------

describe('deactivatePlayer', () => {
  test('returns success with status set to inactive', async () => {
    const inactivePlayer = { ...PLAYER_ROW, status: 'inactive' };
    setQueryResult({ data: inactivePlayer, error: null });

    const result = await deactivatePlayer('player-uuid-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('inactive');
    }
  });

  test('returns an error when playerId is empty', async () => {
    const result = await deactivatePlayer('');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Player ID is required/i);
    }
  });

  test('calls revalidatePath on success', async () => {
    setQueryResult({ data: { ...PLAYER_ROW, status: 'inactive' }, error: null });

    await deactivatePlayer('player-uuid-1');

    expect(revalidatePath).toHaveBeenCalledWith('/players');
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  test('returns a DB error message when the update fails', async () => {
    setQueryResult({
      data: null,
      error: { message: 'permission denied', code: '42501' },
    });

    const result = await deactivatePlayer('player-uuid-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('permission denied');
    }
  });

  test('does not call revalidatePath when the DB returns an error', async () => {
    setQueryResult({
      data: null,
      error: { message: 'permission denied', code: '42501' },
    });

    await deactivatePlayer('player-uuid-1');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reactivatePlayer
// ---------------------------------------------------------------------------

describe('reactivatePlayer', () => {
  test('returns success with status set to active', async () => {
    const activePlayer = { ...PLAYER_ROW, status: 'active' };
    setQueryResult({ data: activePlayer, error: null });

    const result = await reactivatePlayer('player-uuid-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
    }
  });

  test('returns an error when playerId is empty', async () => {
    const result = await reactivatePlayer('');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/Player ID is required/i);
    }
  });

  test('calls revalidatePath on success', async () => {
    setQueryResult({ data: { ...PLAYER_ROW, status: 'active' }, error: null });

    await reactivatePlayer('player-uuid-1');

    expect(revalidatePath).toHaveBeenCalledWith('/players');
  });
});

// ---------------------------------------------------------------------------
// Validation edge cases (shared across create and update)
// ---------------------------------------------------------------------------

describe('player form validation edge cases', () => {
  test('trims whitespace before validating first_name', async () => {
    // Whitespace-only first_name should be treated as missing
    const result = await createPlayer(validPlayerFormData({ first_name: '   ' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.first_name).toBeDefined();
    }
  });

  test('allows an omitted position (position is optional)', async () => {
    setQueryResult({ data: { ...PLAYER_ROW, position: null }, error: null });
    const result = await createPlayer(validPlayerFormData({ position: '' }));
    expect(result.success).toBe(true);
  });

  test('returns a validation error for an invalid status value', async () => {
    const result = await createPlayer(
      validPlayerFormData({ status: 'retired' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = JSON.parse(result.error);
      expect(errors.status).toMatch(/valid status/i);
    }
  });

  test('defaults status to "active" when status field is empty', async () => {
    setQueryResult({ data: PLAYER_ROW, error: null });
    // An empty status string falls back to 'active' in the action.
    const result = await createPlayer(validPlayerFormData({ status: '' }));
    expect(result.success).toBe(true);
  });
});
