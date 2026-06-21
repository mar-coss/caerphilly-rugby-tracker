/**
 * Unit tests for src/lib/utils/errors.ts
 *
 * getErrorMessage and logError are pure (or near-pure) utility functions.
 * logError calls console.error, which we spy on to verify structured output
 * without polluting the test runner's output.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { getErrorMessage, logError } from '@/lib/utils/errors';

// ---------------------------------------------------------------------------
// getErrorMessage
// ---------------------------------------------------------------------------

describe('getErrorMessage', () => {
  test('extracts the message from an Error instance', () => {
    const error = new Error('Something went wrong');
    expect(getErrorMessage(error)).toBe('Something went wrong');
  });

  test('extracts the message from a Supabase PostgrestError shape', () => {
    const supabaseError = {
      message: 'duplicate key value violates unique constraint',
      code: '23505',
      details: 'Key (squad_number)=(7) already exists.',
      hint: '',
    };
    expect(getErrorMessage(supabaseError)).toBe(
      'duplicate key value violates unique constraint',
    );
  });

  test('returns the string directly when error is a plain string', () => {
    expect(getErrorMessage('network timeout')).toBe('network timeout');
  });

  test('returns the fallback message for null', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred.');
  });

  test('returns the fallback message for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred.');
  });

  test('returns the fallback message for a number', () => {
    expect(getErrorMessage(42)).toBe('An unexpected error occurred.');
  });

  test('returns the fallback message for an object without a message property', () => {
    expect(getErrorMessage({ code: '500' })).toBe('An unexpected error occurred.');
  });

  test('returns the fallback message when message property is not a string', () => {
    expect(getErrorMessage({ message: 123 })).toBe('An unexpected error occurred.');
  });

  test('returns the fallback message for an empty object', () => {
    expect(getErrorMessage({})).toBe('An unexpected error occurred.');
  });

  test('returns the fallback message for an array', () => {
    expect(getErrorMessage(['error'])).toBe('An unexpected error occurred.');
  });

  test('handles an Error with an empty message', () => {
    const error = new Error('');
    expect(getErrorMessage(error)).toBe('');
  });

  test('handles subclasses of Error (e.g. TypeError)', () => {
    const error = new TypeError('Cannot read properties of undefined');
    expect(getErrorMessage(error)).toBe('Cannot read properties of undefined');
  });
});

// ---------------------------------------------------------------------------
// logError
// ---------------------------------------------------------------------------

describe('logError', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Replace console.error with a spy to capture calls without terminal noise.
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('calls console.error exactly once', () => {
    logError('testContext', new Error('oops'));
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  test('prefixes the log with [context] in bracket notation', () => {
    logError('createPlayer', new Error('insert failed'));
    const [prefix] = consoleSpy.mock.calls[0];
    expect(prefix).toBe('[createPlayer]');
  });

  // Helper: console.error args are typed as unknown[]. Cast the second arg
  // (the structured payload object) so we can access its properties safely.
  function getPayload(): { message: string; error: unknown; timestamp: string } {
    return consoleSpy.mock.calls[0][1] as { message: string; error: unknown; timestamp: string };
  }

  test('includes the extracted error message in the payload', () => {
    const error = new Error('insert failed');
    logError('createPlayer', error);
    expect(getPayload().message).toBe('insert failed');
  });

  test('includes the raw error object in the payload', () => {
    const error = new Error('insert failed');
    logError('createPlayer', error);
    expect(getPayload().error).toBe(error);
  });

  test('includes a timestamp ISO string in the payload', () => {
    logError('createPlayer', new Error('test'));
    // ISO 8601 pattern: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(getPayload().timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('works with a plain string error', () => {
    logError('updateCoach', 'Database unavailable');
    const [prefix] = consoleSpy.mock.calls[0];
    expect(prefix).toBe('[updateCoach]');
    expect(getPayload().message).toBe('Database unavailable');
  });

  test('works with a Supabase-shaped error object', () => {
    const supabaseError = { message: 'JWT expired', code: 'PGRST301' };
    logError('getPlayers', supabaseError);
    expect(getPayload().message).toBe('JWT expired');
  });

  test('works with a null error value', () => {
    logError('someAction', null);
    expect(getPayload().message).toBe('An unexpected error occurred.');
  });
});
