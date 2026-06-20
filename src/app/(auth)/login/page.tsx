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
        <div
          className="w-16 h-16 bg-green-700 rounded-full mx-auto mb-4 flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-white font-bold text-xl">RFC</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Caerphilly RFC</h1>
        <p className="text-gray-500 text-sm mt-1">Admin Portal</p>
      </div>

      <LoginForm />
    </div>
  );
}
