/**
 * OAuth callback route handler.
 *
 * Supabase SSR uses PKCE (Proof Key for Code Exchange) for OAuth flows.
 * After the user authenticates with Google, Supabase redirects to this
 * route with a `code` query parameter. This handler exchanges that code
 * for a session and sets the session cookies.
 *
 * If the sign-in is rejected by the auth hook (email not in allowlist),
 * Supabase returns an `error` parameter instead of `code`. We redirect the
 * user to the login page with a clear, non-leaking error message.
 *
 * Route: GET /auth/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  // If Supabase returned an error (e.g. hook rejected the sign-in),
  // redirect back to login with a generic message.
  if (error) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'oauth_not_authorised');
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    // No code and no error — something unexpected happened.
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'oauth_failed');
    return NextResponse.redirect(loginUrl);
  }

  // Exchange the PKCE code for a session.
  // We need a mutable response to set cookies on — create it pointing to
  // the dashboard. We'll redirect to login on failure instead.
  let response = NextResponse.redirect(new URL('/', origin));

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    // Exchange failed — could be an expired code or a hook rejection that
    // surfaced here rather than in the redirect params.
    console.error('exchangeCodeForSession error:', exchangeError);
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'oauth_not_authorised');
    response = NextResponse.redirect(loginUrl);
    return response;
  }

  // Session is set. Redirect to dashboard.
  return response;
}
