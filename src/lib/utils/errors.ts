/**
 * Error handling utilities for consistent error management across the app.
 */

/**
 * Extracts a human-readable message from an unknown error value.
 * Handles Error instances, PostgreSQL error objects from Supabase, and
 * plain strings — avoiding the anti-pattern of `catch (e: any)`.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    // Supabase PostgrestError shape
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred.';
}

/**
 * Logs an error with context. In production, this is where you'd send to
 * a service like Sentry. For now it logs to console with a structured format.
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, {
    message: getErrorMessage(error),
    error,
    timestamp: new Date().toISOString(),
  });
}
