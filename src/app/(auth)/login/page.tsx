import type { Metadata } from 'next';
import LoginForm from '@/components/features/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
};

/**
 * Login page — the single entry point for the admin.
 * Authentication is handled by the LoginForm client component via Supabase Auth.
 */
export default function LoginPage() {
  return (
    <div className="w-full max-w-sm px-6">
      {/* Club branding */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <div className="relative w-40 h-40 rounded-full overflow-hidden shadow-2xl border-4 border-green-600 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/caerphilly-titans-logo.png"
              alt="Caerphilly Titans"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Caerphilly RFC</h1>
        <p className="text-gray-500 text-sm mt-1">Admin Portal</p>
      </div>

      <LoginForm />
    </div>
  );
}
