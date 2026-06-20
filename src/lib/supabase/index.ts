/**
 * Barrel export for the browser-safe Supabase client utility.
 *
 * IMPORTANT: This barrel intentionally exports ONLY the browser client.
 * The server client (server.ts) uses next/headers and must be imported
 * directly in server-only files:
 *
 *   import { createSupabaseServerClient } from '@/lib/supabase/server';
 *
 * Exporting the server client here would pull next/headers into client bundles
 * and cause a build error.
 */

export { createSupabaseBrowserClient } from './client';
