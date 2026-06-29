'use client';

/**
 * Login form component.
 *
 * Supports two authentication methods:
 *   1. Email + password (existing behaviour — unchanged)
 *   2. Google OAuth (new) — restricted to emails in the coach_email_allowlist
 *      table, enforced server-side by the restrict_oauth_to_coaches auth hook.
 *
 * The Google OAuth flow uses PKCE. Clicking "Sign in with Google" triggers a
 * browser redirect to Google's consent screen. On completion, Supabase
 * redirects to /auth/callback which exchanges the code for a session.
 *
 * Error handling:
 *   - Password errors: displayed inline (generic message to avoid enumeration).
 *   - OAuth errors: communicated via `?error=` query params set by the callback
 *     route, read from the URL on mount and displayed here.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/utils';

/** Human-readable messages for OAuth error codes returned by /auth/callback. */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_authorised:
    'Your Google account is not authorised to access this portal. Contact the club administrator.',
  oauth_failed:
    'Google sign-in failed. Please try again or use your email and password.',
};

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState<string | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Read any OAuth error passed back via the callback redirect URL.
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(OAUTH_ERROR_MESSAGES[oauthError] ?? OAUTH_ERROR_MESSAGES.oauth_failed);
    }
  }, [searchParams]);

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Use a generic message to avoid leaking whether the email exists.
        setError('Invalid email or password. Please try again.');
        return;
      }

      // Refresh the page so the middleware picks up the new session cookie
      // and redirects to the dashboard.
      router.refresh();
      router.push('/');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsGoogleLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      // redirectTo must match an entry in Supabase Auth > URL Configuration >
      // Allowed Redirect URLs. The callback route exchanges the PKCE code for
      // a session and sets cookies before redirecting to the dashboard.
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Request only the scopes we need (email + profile).
          // Do not request calendar, drive, or other sensitive scopes.
          scopes: 'email profile',
        },
      });

      if (oauthError) {
        setError(OAUTH_ERROR_MESSAGES.oauth_failed);
        setIsGoogleLoading(false);
      }
      // On success, the browser navigates away — no further client-side code runs.
    } catch (caught) {
      setError(getErrorMessage(caught));
      setIsGoogleLoading(false);
    }
  }

  const anyLoading = isLoading || isGoogleLoading;

  return (
    <div className="space-y-5">
      {/* Error alert — shown for both password and OAuth errors */}
      {error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Google Sign-In button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={anyLoading}
        className="
          w-full flex items-center justify-center gap-3 rounded-md border border-gray-300
          bg-white px-4 py-3 text-base sm:text-sm font-medium text-gray-700
          hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-150
        "
        aria-label="Sign in with Google"
      >
        {/* Google 'G' logo — inline SVG avoids an external image request */}
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        {isGoogleLoading ? 'Redirecting to Google…' : 'Sign in with Google'}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-3 text-gray-400">or sign in with password</span>
        </div>
      </div>

      {/* Email + password form */}
      <form onSubmit={handlePasswordSubmit} noValidate className="space-y-5">
        {/* Email field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={anyLoading}
            className="
              block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base sm:text-sm
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
              disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            "
            placeholder="admin@caerphillyrfc.co.uk"
          />
        </div>

        {/* Password field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={anyLoading}
            className="
              block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base sm:text-sm
              placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
              disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
            "
            placeholder="••••••••"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={anyLoading || !email || !password}
          className="
            w-full rounded-md bg-green-700 px-4 py-3 text-base sm:text-sm font-semibold text-white
            hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
