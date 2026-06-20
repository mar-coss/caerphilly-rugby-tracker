'use client';

/**
 * StatusBreakdownChart
 *
 * Pie chart showing the distribution of all attendance records by status
 * (Present, Absent, Late, Injured, Excused).
 *
 * Uses recharts PieChart with a custom legend. Recharts' built-in legend
 * is not used here because we want to show counts and percentages inline.
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AttendanceStatusBreakdown } from '@/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StatusBreakdownChartProps {
  data: AttendanceStatusBreakdown[];
  totalRecords: number;
}

// ---------------------------------------------------------------------------
// Colour map — one colour per status label (English labels from queries.ts)
// ---------------------------------------------------------------------------

const STATUS_COLOURS: Record<string, string> = {
  Present:  '#16a34a', // green-600
  Absent:   '#dc2626', // red-600
  Late:     '#d97706', // amber-600
  Injured:  '#7c3aed', // violet-600
  Excused:  '#2563eb', // blue-600
};

function statusColour(status: string): string {
  return STATUS_COLOURS[status] ?? '#9ca3af';
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AttendanceStatusBreakdown }>;
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const { status, count, percentage } = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-gray-900">{status}</p>
      <p className="text-gray-500 tabular-nums">
        {count} records ({percentage}%)
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusBreakdownChart({
  data,
  totalRecords,
}: StatusBreakdownChartProps) {
  if (data.length === 0 || totalRecords === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No attendance records yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Pie */}
      <div className="w-full sm:w-48 h-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              dataKey="count"
              nameKey="status"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={statusColour(entry.status)}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <ul className="flex-1 w-full space-y-2" role="list">
        {data.map((entry) => (
          <li key={entry.status} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: statusColour(entry.status) }}
                aria-hidden="true"
              />
              <span className="text-sm text-gray-700 truncate">{entry.status}</span>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-sm font-semibold text-gray-900 tabular-nums">
                {entry.percentage}%
              </span>
              <span className="ml-1.5 text-xs text-gray-400 tabular-nums">
                ({entry.count})
              </span>
            </div>
          </li>
        ))}

        {/* Total row */}
        <li className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-500">Total records</span>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {totalRecords}
          </span>
        </li>
      </ul>
    </div>
  );
}
