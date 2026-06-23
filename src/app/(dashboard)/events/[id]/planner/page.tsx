import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PlannerForm } from '@/components/features/planner/PlannerForm';
import { EventTypeBadge } from '@/components/features/events/EventTypeBadge';
import { getTeamLineups } from './actions';
import type { LineupSlot } from '@/types';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('events')
    .select('title')
    .eq('id', id)
    .single();

  return {
    title: data?.title
      ? `Plan Teams — ${data.title} — Caerphilly RFC`
      : 'Team Planner — Caerphilly RFC',
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Team Planner page — only accessible for match-type events.
 *
 * Server component responsibilities:
 * - Fetch the event and verify it exists and is a match.
 * - Fetch all active players (the pool from which coaches assign positions).
 * - Fetch any existing saved lineups so the wizard is pre-populated.
 * - Render the page shell (header, back link) then delegate interactive
 *   work to the PlannerForm client component.
 *
 * Guard: if event.event_type !== 'match', redirect to the event detail page
 * rather than rendering a planner that would make no domain sense.
 */
export default async function TeamPlannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Parallel fetch: event + active players + existing lineups.
  const [eventResult, playersResult, lineupsResult] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('players')
      .select('*')
      .eq('status', 'active')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true }),
    getTeamLineups(id),
  ]);

  // 404 if event not found.
  if (eventResult.error?.code === 'PGRST116') {
    notFound();
  }

  if (eventResult.error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Team Planner</h1>
        <div
          role="alert"
          className="mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          Failed to load event. Please try refreshing the page.
        </div>
      </div>
    );
  }

  const event = eventResult.data;

  // Guard: only match events have a planner.
  if (event.event_type !== 'match') {
    redirect(`/events/${id}`);
  }

  const activePlayers = playersResult.data ?? [];
  const existingLineups: { teamNumber: number; slots: LineupSlot[] }[] =
    lineupsResult.success
      ? lineupsResult.data.map((l) => ({
          teamNumber: l.team_number,
          slots: l.lineups.map((s) => ({
            position: s.position,
            player_id: s.player_id,
          })),
        }))
      : [];

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/events/${id}`}
        className="
          inline-flex items-center gap-1.5 text-sm text-gray-500
          hover:text-gray-700 focus:outline-none focus:underline
          mb-6 transition-colors duration-100
        "
      >
        <span aria-hidden="true">←</span>
        Back to event
      </Link>

      {/* Page header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-4 sm:px-6 sm:py-5 mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <EventTypeBadge type={event.event_type} />
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
            Team Planner
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
          {event.title}
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Plan your match day lineups below. Assign players to each of the 10
          positions per team, then save.
        </p>

        {activePlayers.length === 0 && (
          <div
            role="alert"
            className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
          >
            No active players are available. Add players in the{' '}
            <Link href="/players" className="underline hover:no-underline">
              Players
            </Link>{' '}
            section before planning teams.
          </div>
        )}
      </div>

      {/* Planner wizard */}
      {activePlayers.length > 0 && (
        <PlannerForm
          eventId={id}
          activePlayers={activePlayers}
          existingLineups={existingLineups}
        />
      )}
    </div>
  );
}
