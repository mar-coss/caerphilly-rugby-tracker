'use client';

/**
 * Login form component.
 *
 * Handles email + password authentication against Supabase Auth.
 * On success, the middleware will detect the session cookie and allow
 * access to protected routes.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/utils';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

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
          disabled={isLoading}
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
          disabled={isLoading}
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
        disabled={isLoading || !email || !password}
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
  );
}
