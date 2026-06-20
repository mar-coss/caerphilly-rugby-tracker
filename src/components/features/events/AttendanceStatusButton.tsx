'use client';

/**
 * Interactive attendance status badge for a single player row.
 *
 * Renders the current status as a clickable button. Each click advances to
 * the next status in the cycle. The parent component owns the optimistic
 * state and the server action call; this component surfaces loading/error
 * feedback for the individual row.
 *
 * Responsibilities:
 * - Render the coloured status badge as an accessible button
 * - Accept an `isPending` flag to show a subtle loading ring while saving
 * - Accept an `error` string to surface per-row save failures
 * - Emit `onStatusChange` with the next status when clicked
 * - Be purely presentational — no direct server action calls here
 */

import { cn } from '@/lib/utils';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { AttendanceStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Status display configuration
// ---------------------------------------------------------------------------

export const ATTENDANCE_STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; variant: BadgeVariant }
> = {
  present: { label: 'Present',  variant: 'green'  },
  absent:  { label: 'Absent',   variant: 'red'    },
  late:    { label: 'Late',     variant: 'yellow' },
  injured: { label: 'Injured',  variant: 'yellow' },
  excused: { label: 'Excused',  variant: 'gray'   },
};

/**
 * Cycle order for status progression when a coach clicks the badge.
 * The most common flow when marking a register is:
 *   absent (default) → present → late → injured → excused → back to absent
 */
const STATUS_CYCLE: AttendanceStatus[] = [
  'absent',
  'present',
  'late',
  'injured',
  'excused',
];

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green:  'bg-green-50 text-green-700 ring-green-600/20',
  yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  red:    'bg-red-50 text-red-700 ring-red-600/20',
  blue:   'bg-blue-50 text-blue-700 ring-blue-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  gray:   'bg-gray-50 text-gray-600 ring-gray-500/10',
};

// ---------------------------------------------------------------------------
// Exported helper — consumed by parent to derive next status without coupling
// ---------------------------------------------------------------------------

export function getNextAttendanceStatus(current: AttendanceStatus): AttendanceStatus {
  const currentIndex = STATUS_CYCLE.indexOf(current);
  const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
  return STATUS_CYCLE[nextIndex];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttendanceStatusButtonProps {
  attendanceId: string;
  status: AttendanceStatus;
  isPending: boolean;
  error: string | null;
  onStatusChange: (attendanceId: string, nextStatus: AttendanceStatus) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AttendanceStatusButton({
  attendanceId,
  status,
  isPending,
  error,
  onStatusChange,
}: AttendanceStatusButtonProps) {
  const config = ATTENDANCE_STATUS_CONFIG[status] ?? ATTENDANCE_STATUS_CONFIG.absent;
  const nextStatus = getNextAttendanceStatus(status);

  function handleClick() {
    if (!isPending) {
      onStatusChange(attendanceId, nextStatus);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        aria-label={`Status: ${config.label}. Click to change to ${ATTENDANCE_STATUS_CONFIG[nextStatus].label}`}
        aria-busy={isPending}
        className={cn(
          // Generous touch target — min 44×44 CSS pixels as per WCAG 2.5.5.
          // The visible badge uses px/py for visual sizing; the extra
          // min-h/min-w ensures the hit area is always tap-friendly on mobile.
          'inline-flex items-center justify-center rounded-md',
          'min-h-[2.75rem] min-w-[5rem] px-3 py-1.5',
          'sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-0.5',
          'text-xs font-medium ring-1 ring-inset',
          'cursor-pointer transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'focus-visible:ring-green-600',
          VARIANT_CLASSES[config.variant],
          // Loading state: reduce opacity and add an outer ring
          isPending && 'opacity-60 cursor-wait ring-2',
          // Hover: slight brightness lift to signal interactivity
          !isPending && 'hover:brightness-95 hover:shadow-sm',
        )}
      >
        {isPending ? (
          /*
           * Inline spinner replaces the label text while saving.
           * Width is kept consistent with the label so the cell does not
           * resize and cause layout jank.
           */
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <svg
              className="h-3 w-3 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>{config.label}</span>
          </span>
        ) : (
          config.label
        )}
      </button>

      {/* Per-row save error shown inline beneath the badge */}
      {error && (
        <p role="alert" className="text-xs text-red-600 leading-tight max-w-[120px]">
          {error}
        </p>
      )}
    </div>
  );
}
