/**
 * Shared Supabase mock factory for server action tests.
 *
 * The Supabase client uses a fluent builder API:
 *   supabase.from('table').insert(data).select().single()
 *
 * Each method in the chain returns `this` (the same mock object) so we can
 * configure a single mock instance and have every chained call resolve to it.
 * The terminal methods (single, then the implicit Promise) resolve to the
 * configured { data, error } fixture.
 *
 * Usage:
 *   const { mockSupabase, setQueryResult } = createSupabaseMock();
 *   vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);
 *   setQueryResult({ data: myData, error: null });
 */

import { vi } from 'vitest';

export type SupabaseQueryResult<T = unknown> = {
  data: T | null;
  error: { message: string; code: string } | null;
};

/**
 * Creates a chainable Supabase client mock.
 *
 * The mock supports the fluent query-builder pattern used throughout the
 * server actions: from → insert/update/delete/select/upsert → eq/order →
 * select/single → Promise<{ data, error }>.
 *
 * A single `result` object is shared across all chain calls. Tests call
 * `setQueryResult` to inject the desired response before invoking the action.
 */
export function createSupabaseMock() {
  // The result that terminal chain methods will resolve to.
  let pendingResult: SupabaseQueryResult = { data: null, error: null };

  /**
   * Override the resolved value for the next query chain.
   * Call this before invoking the action under test.
   */
  function setQueryResult(result: SupabaseQueryResult) {
    pendingResult = result;
  }

  // Build a proxy that returns itself for every method call, and behaves
  // like a Promise for the terminal await by implementing .then/.catch.
  const chainable: Record<string, unknown> = {};

  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      // Make the mock awaitable at any point in the chain.
      if (prop === 'then') {
        return (resolve: (v: SupabaseQueryResult) => void) => resolve(pendingResult);
      }
      if (prop === 'catch') {
        return () => proxy;
      }
      // All other method calls (from, insert, update, delete, upsert,
      // select, single, eq, order, in) return the proxy itself.
      return vi.fn().mockReturnValue(proxy);
    },
  };

  const proxy = new Proxy(chainable, handler);

  /**
   * The mock client object passed to vi.mocked(createSupabaseServerClient).
   * Only the `from` method is needed — everything else is handled by the proxy.
   */
  const mockSupabase = {
    from: vi.fn().mockReturnValue(proxy),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };

  return { mockSupabase, setQueryResult, proxy };
}
