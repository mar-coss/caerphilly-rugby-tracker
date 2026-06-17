import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CoachTable } from '@/components/features/coaches/CoachTable';
import { AddCoachButton } from '@/components/features/coaches/AddCoachButton';
import type { Coach } from '@/types';

export const metadata: Metadata = {
  title: 'Coaches — Caerphilly RFC',
};

/**
 * Coaching staff management page.
 *
 * Server component — fetches all coaches and passes them to the interactive
 * CoachTable client component. Mirrors the Players page pattern.
 */
export default async function CoachesPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Coaches</h1>
        <div
          role="alert"
          className="mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          Failed to load coaches. Please try refreshing the page.
        </div>
      </div>
    );
  }

  const coaches: Coach[] = (data ?? []).map((c) => ({
    ...c,
    full_name: `${c.first_name} ${c.last_name}`,
  }));

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coaches</h1>
          <p className="mt-1 text-sm text-gray-500">
            {coaches.length === 0
              ? 'No coaches added yet.'
              : `${coaches.length} ${coaches.length === 1 ? 'coach' : 'coaches'}`}
          </p>
        </div>
        <AddCoachButton />
      </div>

      {/* Coaching staff table */}
      <CoachTable coaches={coaches} />
    </div>
  );
}
