import type { Metadata } from 'next';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PlayerTable } from '@/components/features/players/PlayerTable';
import { AddPlayerButton } from '@/components/features/players/AddPlayerButton';
import type { Player } from '@/types';

export const metadata: Metadata = {
  title: 'Players — Caerphilly RFC',
};

/**
 * Players roster page.
 *
 * Server component — fetches all players and passes them to the interactive
 * PlayerTable client component. The page header contains the AddPlayerButton
 * (a small client island) so the rest of the page stays server-rendered.
 */
export default async function PlayersPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  // Surface the error rather than rendering a broken table.
  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Players</h1>
        <div
          role="alert"
          className="mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          Failed to load players. Please try refreshing the page.
        </div>
      </div>
    );
  }

  const players: Player[] = (data ?? []).map((p) => ({
    ...p,
    full_name: `${p.first_name} ${p.last_name}`,
  }));

  const activePlayers = players.filter((p) => p.status === 'active');
  const totalPlayers = players.length;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          <p className="mt-1 text-sm text-gray-500">
            {activePlayers.length} active
            {totalPlayers !== activePlayers.length && (
              <> · {totalPlayers - activePlayers.length} inactive</>
            )}
            {totalPlayers > 0 && (
              <> · {totalPlayers} total</>
            )}
          </p>
        </div>
        <AddPlayerButton />
      </div>

      {/* Player roster table */}
      <PlayerTable players={players} />
    </div>
  );
}
