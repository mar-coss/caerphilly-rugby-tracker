/**
 * Layout for all authenticated dashboard pages.
 * Includes the main navigation sidebar.
 */

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import DashboardNav from '@/components/features/layout/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side session validation. The middleware handles most cases, but
  // this guard ensures no dashboard page can render without a valid session.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardNav userEmail={user.email ?? ''} />
      {/*
       * On mobile the DashboardNav renders a fixed top bar (h-14) and a
       * spacer div to push content below it. On md+ the sidebar is a flex
       * sibling so no top padding is needed.
       */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0 p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
