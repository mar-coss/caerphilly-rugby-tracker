'use client';

/**
 * Interactive player roster table.
 *
 * Displays all players with their key details and per-row action buttons.
 * Manages the edit dialog open state locally so that the server component
 * (the page) stays simple and data-focused.
 *
 * Deactivate uses an optimistic update so the row visually changes immediately
 * while the server action is in flight, with a rollback on failure.
 */

import { useState, useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlayerStatusBadge } from './PlayerStatusBadge';
import { PlayerFormDialog } from './PlayerFormDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatSquadNumber } from '@/lib/utils';
import { deactivatePlayer, reactivatePlayer } from '@/app/(dashboard)/players/actions';
import type { Player } from '@/types';
import type { PlayerStatus } from '@/types/database';

interface PlayerTableProps {
  players: Player[];
}

type OptimisticAction =
  | { type: 'deactivate'; id: string }
  | { type: 'reactivate'; id: string };

function applyOptimisticAction(
  players: Player[],
  action: OptimisticAction,
): Player[] {
  return players.map((p) => {
    if (p.id !== action.id) return p;
    const newStatus: PlayerStatus =
      action.type === 'deactivate' ? 'inactive' : 'active';
    return { ...p, status: newStatus };
  });
}

export function PlayerTable({ players }: PlayerTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticPlayers, addOptimisticAction] = useOptimistic(
    players,
    applyOptimisticAction,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit dialog state
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  function openAddDialog() {
    setIsAddDialogOpen(true);
  }

  function handleDeactivate(player: Player) {
    setErrorMessage(null);
    startTransition(async () => {
      addOptimisticAction({ type: 'deactivate', id: player.id });
      const result = await deactivatePlayer(player.id);
      if (!result.success) {
        setErrorMessage(`Failed to deactivate ${player.full_name}: ${result.error}`);
        router.refresh(); // Roll back by re-fetching server data
      }
    });
  }

  function handleReactivate(player: Player) {
    setErrorMessage(null);
    startTransition(async () => {
      addOptimisticAction({ type: 'reactivate', id: player.id });
      const result = await reactivatePlayer(player.id);
      if (!result.success) {
        setErrorMessage(`Failed to reactivate ${player.full_name}: ${result.error}`);
        router.refresh();
      }
    });
  }

  // --------------------------------------------------------------------------
  // Empty state
  // --------------------------------------------------------------------------

  if (optimisticPlayers.length === 0) {
    return (
      <>
        <EmptyState
          title="No players yet"
          description="Add your first player to get the roster started."
          actionLabel="Add player"
          onAction={openAddDialog}
        />
        <PlayerFormDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
        />
      </>
    );
  }

  // --------------------------------------------------------------------------
  // Table
  // --------------------------------------------------------------------------

  return (
    <div>
      {/* Error banner */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-4 text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  #
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Position
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Status
                </th>
                <th scope="col" className="relative px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {optimisticPlayers.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  isPending={isPending}
                  onEdit={() => setEditingPlayer(player)}
                  onDeactivate={() => handleDeactivate(player)}
                  onReactivate={() => handleReactivate(player)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog — renders as a portal */}
      <PlayerFormDialog
        isOpen={editingPlayer !== null}
        onClose={() => setEditingPlayer(null)}
        player={editingPlayer ?? undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row sub-component — extracted to keep the parent readable
// ---------------------------------------------------------------------------

interface PlayerRowProps {
  player: Player;
  isPending: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}

function PlayerRow({
  player,
  isPending,
  onEdit,
  onDeactivate,
  onReactivate,
}: PlayerRowProps) {
  const isActive = player.status === 'active';

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-75">
      {/* Squad number */}
      <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-500">
        {formatSquadNumber(player.squad_number)}
      </td>

      {/* Name */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{player.full_name}</p>
        {player.email && (
          <p className="text-xs text-gray-400 mt-0.5">{player.email}</p>
        )}
      </td>

      {/* Position */}
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
        {player.position ?? <span className="text-gray-300">—</span>}
      </td>

      {/* Status */}
      <td className="whitespace-nowrap px-4 py-3">
        <PlayerStatusBadge status={player.status} />
      </td>

      {/* Actions */}
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={isPending}
            className="
              rounded px-2.5 py-1 text-xs font-medium text-gray-600
              border border-gray-200 bg-white
              hover:bg-gray-50 hover:border-gray-300
              focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-100
            "
          >
            Edit
          </button>

          {isActive ? (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={isPending}
              className="
                inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium
                text-red-600 border border-red-200 bg-red-50
                hover:bg-red-100 hover:border-red-300
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors duration-100
              "
            >
              {isPending && <LoadingSpinner size="sm" />}
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={onReactivate}
              disabled={isPending}
              className="
                inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium
                text-green-700 border border-green-200 bg-green-50
                hover:bg-green-100 hover:border-green-300
                focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors duration-100
              "
            >
              {isPending && <LoadingSpinner size="sm" />}
              Reactivate
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
