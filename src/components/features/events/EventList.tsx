'use client';

/**
 * Interactive event list.
 *
 * Displays all events as a card-based list with:
 * - Event type badge, title, date, location, and attendance summary
 * - Link to the event detail page
 * - Delete button with optimistic removal and rollback on failure
 *
 * The page that renders this component is a Server Component; EventList is
 * the sole client island responsible for interactivity.
 */

import { useState, useOptimistic, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EventTypeBadge } from './EventTypeBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EventFormDialog } from './EventFormDialog';
import { formatDateTime } from '@/lib/utils';
import { deleteEvent } from '@/app/(dashboard)/events/actions';
import type { EventWithAttendanceSummary } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventListProps {
  events: EventWithAttendanceSummary[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventList({ events }: EventListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticEvents, removeOptimisticEvent] = useOptimistic(
    events,
    (current: EventWithAttendanceSummary[], deletedId: string) =>
      current.filter((e) => e.id !== deletedId),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  function handleDelete(event: EventWithAttendanceSummary) {
    setErrorMessage(null);
    startTransition(async () => {
      removeOptimisticEvent(event.id);
      const result = await deleteEvent(event.id);
      if (!result.success) {
        setErrorMessage(`Failed to delete "${event.title}": ${result.error}`);
        router.refresh(); // Roll back by re-fetching server data
      }
    });
  }

  // --------------------------------------------------------------------------
  // Empty state
  // --------------------------------------------------------------------------

  if (optimisticEvents.length === 0) {
    return (
      <>
        <EmptyState
          title="No events yet"
          description="Create your first event to start tracking attendance."
          actionLabel="Create event"
          onAction={() => setIsAddDialogOpen(true)}
        />
        <EventFormDialog
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
        />
      </>
    );
  }

  // --------------------------------------------------------------------------
  // Event list
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

      <ul className="space-y-3" role="list">
        {optimisticEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isPending={isPending}
            onDelete={() => handleDelete(event)}
          />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventCard sub-component
// ---------------------------------------------------------------------------

interface EventCardProps {
  event: EventWithAttendanceSummary;
  isPending: boolean;
  onDelete: () => void;
}

function EventCard({ event, isPending, onDelete }: EventCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Two-step delete confirmation: first click shows a confirm button,
  // second click triggers the actual deletion. Clicking elsewhere resets.
  function handleDeleteClick() {
    if (confirmingDelete) {
      setConfirmingDelete(false);
      onDelete();
    } else {
      setConfirmingDelete(true);
    }
  }

  function handleCancelConfirm() {
    setConfirmingDelete(false);
  }

  const isUpcoming = new Date(event.event_date) >= new Date();

  return (
    <li className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-150">
      <div className="px-4 py-4 sm:px-5">
        {/* Top row: badges + attendance stat */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <EventTypeBadge type={event.event_type} />
            {isUpcoming && (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                Upcoming
              </span>
            )}
            {event.is_cancelled && (
              <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                Cancelled
              </span>
            )}
          </div>

          {/* Attendance summary — always visible */}
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {event.present_count}
              <span className="text-gray-400 font-normal">/{event.attendance_count}</span>
            </p>
            <p className="text-xs text-gray-400">present</p>
          </div>
        </div>

        {/* Event title */}
        <Link
          href={`/events/${event.id}`}
          className="block text-base font-semibold text-gray-900 hover:text-green-700 focus:outline-none focus:underline transition-colors duration-100"
        >
          {event.title}
        </Link>

        {/* Date and location */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-gray-500">
          <span>{formatDateTime(event.event_date)}</span>
          {event.location && (
            <span className="flex items-center gap-1">
              <span aria-hidden="true">·</span>
              {event.location}
            </span>
          )}
        </div>

        {/* Action buttons — full width on mobile for easier tapping */}
        <div className="mt-3 flex items-center gap-2">
          <Link
            href={`/events/${event.id}`}
            className="
              flex-1 sm:flex-none text-center
              rounded-lg px-3 py-2 text-xs font-medium text-gray-600
              border border-gray-200 bg-white
              hover:bg-gray-50 hover:border-gray-300
              focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1
              transition-colors duration-100
            "
          >
            View Register
          </Link>

          {confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={isPending}
                className="
                  flex-1 sm:flex-none rounded-lg px-3 py-2 text-xs font-medium text-gray-600
                  border border-gray-200 bg-white
                  hover:bg-gray-50
                  focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors duration-100
                "
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isPending}
                className="
                  flex-1 sm:flex-none inline-flex items-center justify-center gap-1
                  rounded-lg px-3 py-2 text-xs font-medium
                  text-white bg-red-600
                  hover:bg-red-700
                  focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors duration-100
                "
              >
                {isPending && <LoadingSpinner size="sm" />}
                Confirm delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={isPending}
              className="
                flex-1 sm:flex-none rounded-lg px-3 py-2 text-xs font-medium
                text-red-600 border border-red-200 bg-red-50
                hover:bg-red-100 hover:border-red-300
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors duration-100
              "
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
