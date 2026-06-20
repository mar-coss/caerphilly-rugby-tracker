/**
 * Browser-side Supabase client.
 *
 * Use this ONLY in Client Components ('use client').
 * The @supabase/ssr package handles cookie-based auth across server/client
 * boundaries correctly — do not use createClient from @supabase/supabase-js
 * directly as it won't share the auth session with server components.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client for use in browser (client) environments.
 *
 * This is intentionally a factory function rather than a singleton so that
 * it integrates cleanly with React's rendering model. Call it once at the
 * top of your component or custom hook.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
