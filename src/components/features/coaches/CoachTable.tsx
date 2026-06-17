'use client';

/**
 * Interactive coaches table.
 *
 * Displays all coaches with role badges and per-row edit/remove actions.
 * Optimistic removal updates the list immediately while the server action
 * is in flight, with a rollback via router.refresh() on failure.
 */

import { useState, useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CoachRoleBadge } from './CoachRoleBadge';
import { CoachFormDialog } from './CoachFormDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { deactivateCoach } from '@/app/(dashboard)/coaches/actions';
import type { Coach } from '@/types';

interface CoachTableProps {
  coaches: Coach[];
}

export function CoachTable({ coaches }: CoachTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic removal — filter out the coach being deactivated immediately.
  const [optimisticCoaches, removeOptimistically] = useOptimistic(
    coaches,
    (current: Coach[], removedId: string) =>
      current.filter((c) => c.id !== removedId),
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  function handleRemove(coach: Coach) {
    setErrorMessage(null);

    // Ask for confirmation before removing — no undo for coaches.
    const confirmed = window.confirm(
      `Remove ${coach.full_name} from the coaching staff?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      removeOptimistically(coach.id);
      const result = await deactivateCoach(coach.id);
      if (!result.success) {
        setErrorMessage(`Failed to remove ${coach.full_name}: ${result.error}`);
        router.refresh();
      }
    });
  }

  // --------------------------------------------------------------------------
  // Empty state
  // --------------------------------------------------------------------------

  if (optimisticCoaches.length === 0) {
    return (
      <>
        <EmptyState
          title="No coaches yet"
          description="Add your first coach to get the staff directory started."
          actionLabel="Add coach"
          onAction={() => setIsAddDialogOpen(true)}
        />
        <CoachFormDialog
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
                  Name
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Contact
                </th>
                <th scope="col" className="relative px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {optimisticCoaches.map((coach) => (
                <CoachRow
                  key={coach.id}
                  coach={coach}
                  isPending={isPending}
                  onEdit={() => setEditingCoach(coach)}
                  onRemove={() => handleRemove(coach)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <CoachFormDialog
        isOpen={editingCoach !== null}
        onClose={() => setEditingCoach(null)}
        coach={editingCoach ?? undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------

interface CoachRowProps {
  coach: Coach;
  isPending: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

function CoachRow({ coach, isPending, onEdit, onRemove }: CoachRowProps) {
  const hasContact = coach.email || coach.phone;

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-75">
      {/* Name */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{coach.full_name}</p>
      </td>

      {/* Role */}
      <td className="whitespace-nowrap px-4 py-3">
        <CoachRoleBadge role={coach.role} />
      </td>

      {/* Contact */}
      <td className="px-4 py-3 text-sm text-gray-600">
        {hasContact ? (
          <div className="space-y-0.5">
            {coach.email && (
              <a
                href={`mailto:${coach.email}`}
                className="block text-green-700 hover:underline"
              >
                {coach.email}
              </a>
            )}
            {coach.phone && (
              <a
                href={`tel:${coach.phone}`}
                className="block text-gray-500 hover:underline"
              >
                {coach.phone}
              </a>
            )}
          </div>
        ) : (
          <span className="text-gray-300">—</span>
        )}
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

          <button
            type="button"
            onClick={onRemove}
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
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}
