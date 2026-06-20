'use client';

/**
 * Interactive attendance register for an event.
 *
 * This is the client-side counterpart to the read-only EventAttendanceTable.
 * It owns the optimistic UI layer for status changes and delegates individual
 * row rendering to AttendanceStatusButton.
 *
 * Architecture:
 * - Receives the initial attendance list from the server as props
 * - Applies useOptimistic so status changes feel instant
 * - Calls updateAttendanceStatus (server action) to persist changes
 * - Computes live summary stats from the optimistic state (not the server state)
 *   so the header counts update the moment a coach taps a badge
 * - Tracks per-row errors independently so a single save failure only affects
 *   that one row — the rest of the register remains usable
 * - Rolls back the optimistic update automatically if the server action fails
 *   (useOptimistic reverts when the async function completes without updating state)
 *
 * Sorting: stable sort by status group then last name. Because optimistic
 * updates change status, the sort is re-applied on every render so the rows
 * always appear in the correct group (present/late → absent → excused/injured).
 */

import { useOptimistic, useTransition, useCallback, useState } from 'react';
import { updateAttendanceStatus } from '@/app/(dashboard)/events/actions';
import {
  AttendanceStatusButton,
  ATTENDANCE_STATUS_CONFIG,
} from './AttendanceStatusButton';
import type { AttendanceWithPlayer } from '@/types';
import type { AttendanceStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventAttendanceRegisterProps {
  eventId: string;
  attendances: AttendanceWithPlayer[];
}

/**
 * The shape used internally by useOptimistic.
 * We optimistically update the status field only; all other fields remain stable.
 */
type OptimisticAttendance = AttendanceWithPlayer & {
  optimisticStatus?: AttendanceStatus;
};

type OptimisticAction = {
  attendanceId: string;
  newStatus: AttendanceStatus;
};

// ---------------------------------------------------------------------------
// Sorting helpers — kept stable so they don't recreate on every render
// ---------------------------------------------------------------------------

const STATUS_SORT_ORDER: Record<AttendanceStatus, number> = {
  present: 0,
  late:    1,
  absent:  2,
  excused: 3,
  injured: 4,
};

function sortAttendances(rows: OptimisticAttendance[]): OptimisticAttendance[] {
  return [...rows].sort((a, b) => {
    const aStatus = a.optimisticStatus ?? a.status;
    const bStatus = b.optimisticStatus ?? b.status;
    const orderDiff = (STATUS_SORT_ORDER[aStatus] ?? 5) - (STATUS_SORT_ORDER[bStatus] ?? 5);
    if (orderDiff !== 0) return orderDiff;

    const aName = a.player?.last_name ?? a.coach?.last_name ?? '';
    const bName = b.player?.last_name ?? b.coach?.last_name ?? '';
    return aName.localeCompare(bName);
  });
}

// ---------------------------------------------------------------------------
// Summary stat helpers
// ---------------------------------------------------------------------------

interface AttendanceSummary {
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  totalCount: number;
}

function computeSummary(rows: OptimisticAttendance[]): AttendanceSummary {
  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  for (const row of rows) {
    const status = row.optimisticStatus ?? row.status;
    if (status === 'present' || status === 'late') presentCount += 1;
    else if (status === 'absent') absentCount += 1;
    else if (status === 'excused' || status === 'injured') excusedCount += 1;
  }

  return { presentCount, absentCount, excusedCount, totalCount: rows.length };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventAttendanceRegister({
  eventId,
  attendances,
}: EventAttendanceRegisterProps) {
  // useTransition gives us isPending for the global saving state, but we also
  // track per-row errors in local state so individual save failures are surfaced
  // without disrupting other rows.
  const [, startTransition] = useTransition();

  // Per-row error map: attendanceId → error message
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // useOptimistic takes the server-authoritative list and a reducer that applies
  // optimistic updates. The reducer sets an `optimisticStatus` field on the
  // matching row so the actual `status` field is preserved for rollback.
  const [optimisticAttendances, applyOptimisticUpdate] = useOptimistic<
    OptimisticAttendance[],
    OptimisticAction
  >(
    attendances,
    (currentRows, { attendanceId, newStatus }) =>
      currentRows.map((row) =>
        row.id === attendanceId
          ? { ...row, optimisticStatus: newStatus }
          : row,
      ),
  );

  const handleStatusChange = useCallback(
    (attendanceId: string, nextStatus: AttendanceStatus) => {
      // Clear any existing error for this row immediately on a new attempt.
      setRowErrors((prev) => {
        if (!prev[attendanceId]) return prev;
        const updated = { ...prev };
        delete updated[attendanceId];
        return updated;
      });

      startTransition(async () => {
        // Apply the optimistic update inside the transition so React treats it
        // as a concurrent update that can be rolled back.
        applyOptimisticUpdate({ attendanceId, newStatus: nextStatus });

        const result = await updateAttendanceStatus(attendanceId, eventId, nextStatus);

        if (!result.success) {
          // Surface the per-row error. The optimistic state reverts automatically
          // when the transition completes without a matching state update.
          setRowErrors((prev) => ({ ...prev, [attendanceId]: result.error }));
        }
      });
    },
    [eventId, applyOptimisticUpdate],
  );

  // Derive live stats from the optimistic state so they update immediately.
  const { presentCount, absentCount, excusedCount, totalCount } =
    computeSummary(optimisticAttendances);

  const sorted = sortAttendances(optimisticAttendances);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-500">No attendance records for this event.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live attendance summary — updates optimistically as statuses change */}
      <AttendanceRegisterSummary
        presentCount={presentCount}
        absentCount={absentCount}
        excusedCount={excusedCount}
        totalCount={totalCount}
      />

      {/* Attendance table */}
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
                {/* Role column hidden on small screens — not essential for taking a register */}
                <th
                  scope="col"
                  className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Status
                </th>
                {/* Notes column hidden on small screens */}
                <th
                  scope="col"
                  className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Notes
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {sorted.map((attendance) => {
                const effectiveStatus = attendance.optimisticStatus ?? attendance.status;
                const person = attendance.player ?? attendance.coach;
                const fullName = person
                  ? `${person.first_name} ${person.last_name}`
                  : 'Unknown';
                const role = attendance.player ? 'Player' : 'Coach';
                const isPending = attendance.optimisticStatus !== undefined;
                const rowError = rowErrors[attendance.id] ?? null;

                return (
                  <tr
                    key={attendance.id}
                    className="hover:bg-gray-50 transition-colors duration-75"
                  >
                    {/* Name — always visible */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{fullName}</p>
                      {attendance.player?.position && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {attendance.player.position}
                        </p>
                      )}
                      {/* On mobile, show role inline under the name */}
                      <p className="sm:hidden text-xs text-gray-400 mt-0.5">{role}</p>
                    </td>

                    {/* Role — hidden on small screens */}
                    <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {role}
                    </td>

                    {/* Status — interactive button, always visible */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <AttendanceStatusButton
                        attendanceId={attendance.id}
                        status={effectiveStatus}
                        isPending={isPending}
                        error={rowError}
                        onStatusChange={handleStatusChange}
                      />
                    </td>

                    {/* Notes — hidden on small screens */}
                    <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-400">
                      {attendance.notes ?? <span aria-label="no notes">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <p className="text-xs text-gray-400 text-right">
        Click a status badge to cycle:{' '}
        {(['absent', 'present', 'late', 'injured', 'excused'] as AttendanceStatus[]).map(
          (s, i, arr) => (
            <span key={s}>
              <span
                className={`font-medium ${
                  ATTENDANCE_STATUS_CONFIG[s].variant === 'green'
                    ? 'text-green-700'
                    : ATTENDANCE_STATUS_CONFIG[s].variant === 'red'
                      ? 'text-red-600'
                      : ATTENDANCE_STATUS_CONFIG[s].variant === 'yellow'
                        ? 'text-yellow-700'
                        : 'text-gray-500'
                }`}
              >
                {ATTENDANCE_STATUS_CONFIG[s].label}
              </span>
              {i < arr.length - 1 && <span className="text-gray-300"> → </span>}
            </span>
          ),
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AttendanceRegisterSummary
//
// Pure display component for the live summary row above the table.
// Extracted so it can be updated independently without re-rendering the table.
// ---------------------------------------------------------------------------

interface AttendanceRegisterSummaryProps {
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  totalCount: number;
}

function AttendanceRegisterSummary({
  presentCount,
  absentCount,
  excusedCount,
  totalCount,
}: AttendanceRegisterSummaryProps) {
  return (
    <dl
      className="flex flex-wrap gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
      aria-label="Live attendance summary"
    >
      <div className="flex items-center gap-2">
        <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Present
        </dt>
        <dd className="text-lg font-bold text-green-700 tabular-nums">{presentCount}</dd>
      </div>

      <div className="flex items-center gap-2">
        <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Absent
        </dt>
        <dd className="text-lg font-bold text-red-600 tabular-nums">{absentCount}</dd>
      </div>

      {excusedCount > 0 && (
        <div className="flex items-center gap-2">
          <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Excused
          </dt>
          <dd className="text-lg font-bold text-gray-500 tabular-nums">{excusedCount}</dd>
        </div>
      )}

      <div className="flex items-center gap-2">
        <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Total
        </dt>
        <dd className="text-lg font-bold text-gray-900 tabular-nums">{totalCount}</dd>
      </div>
    </dl>
  );
}
