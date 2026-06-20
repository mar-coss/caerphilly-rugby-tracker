/**
 * Read-only attendance table for the event detail page.
 *
 * Displays all attendance records for an event, showing the player name
 * and their current attendance status. The status toggle functionality will
 * be added in Milestone 4.
 *
 * This is a Server Component — it receives already-fetched data as props and
 * renders statically. No client-side interactivity here yet.
 */

import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { AttendanceStatus } from '@/types/database';
import type { AttendanceWithPlayer } from '@/types';

// ---------------------------------------------------------------------------
// Status display configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; variant: BadgeVariant }> = {
  present: { label: 'Present',  variant: 'green'  },
  absent:  { label: 'Absent',   variant: 'red'    },
  late:    { label: 'Late',     variant: 'yellow' },
  injured: { label: 'Injured',  variant: 'yellow' },
  excused: { label: 'Excused',  variant: 'gray'   },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventAttendanceTableProps {
  attendances: AttendanceWithPlayer[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventAttendanceTable({ attendances }: EventAttendanceTableProps) {
  if (attendances.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-500">
          No attendance records for this event.
        </p>
      </div>
    );
  }

  // Sort: present/late first, then absent, then excused/injured — within each
  // group sort alphabetically by last name.
  const sorted = [...attendances].sort((a, b) => {
    const statusOrder: Record<AttendanceStatus, number> = {
      present: 0,
      late:    1,
      absent:  2,
      excused: 3,
      injured: 4,
    };
    const aOrder = statusOrder[a.status] ?? 5;
    const bOrder = statusOrder[b.status] ?? 5;
    if (aOrder !== bOrder) return aOrder - bOrder;

    // Alphabetical by last name within the same status group.
    const aName = a.player?.last_name ?? a.coach?.last_name ?? '';
    const bName = b.player?.last_name ?? b.coach?.last_name ?? '';
    return aName.localeCompare(bName);
  });

  return (
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
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Notes
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {sorted.map((attendance) => {
              const person = attendance.player ?? attendance.coach;
              const fullName = person
                ? `${person.first_name} ${person.last_name}`
                : 'Unknown';
              const role = attendance.player ? 'Player' : 'Coach';
              const statusConfig = STATUS_CONFIG[attendance.status] ?? STATUS_CONFIG.absent;

              return (
                <tr key={attendance.id} className="hover:bg-gray-50 transition-colors duration-75">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{fullName}</p>
                    {attendance.player?.position && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {attendance.player.position}
                      </p>
                    )}
                  </td>

                  {/* Role */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {role}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge
                      label={statusConfig.label}
                      variant={statusConfig.variant}
                    />
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {attendance.notes ?? <span aria-label="no notes">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
