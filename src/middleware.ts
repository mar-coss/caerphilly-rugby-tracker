/**
 * Next.js middleware for authentication.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie on every request (required by @supabase/ssr).
 * 2. Redirect unauthenticated users away from protected routes to /login.
 * 3. Redirect authenticated users away from /login to the dashboard.
 *
 * The matcher config ensures this runs only on relevant paths, not on
 * static assets or Next.js internals.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

const LOGIN_PATH = '/login';
const DASHBOARD_PATH = '/';

/** Routes that do not require authentication. */
const PUBLIC_PATHS = new Set([LOGIN_PATH]);

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create a server client that can read/write cookies on this request.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to
  // debug issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  // Redirect unauthenticated users to login.
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login to the dashboard.
  if (user && pathname === LOGIN_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD_PATH;
    return NextResponse.redirect(url);
  }

  // IMPORTANT: Return supabaseResponse, not a newly created NextResponse.
  // If you create a new response object, you'll lose the refreshed auth cookies.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Any file with an extension (e.g. .png, .jpg)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
