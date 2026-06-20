'use client';

/**
 * PlayerAttendanceChart
 *
 * Horizontal bar chart showing each player's attendance rate (%).
 * Bars are colour-coded:
 *   - 80%+  → green  (high attendance)
 *   - 50–79% → amber  (medium attendance)
 *   - <50%  → red    (low attendance)
 *
 * Receives plain serialisable data from the server component parent
 * so it can be rendered as a client island.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { PlayerAttendanceStat } from '@/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerAttendanceChartProps {
  data: PlayerAttendanceStat[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function barColour(rate: number): string {
  if (rate >= 80) return '#16a34a'; // green-600
  if (rate >= 50) return '#d97706'; // amber-600
  return '#dc2626';                 // red-600
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload: PlayerAttendanceStat }>;
}

function AttendanceTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;

  const { playerName, attendanceRate, presentCount, totalEvents, position } =
    payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1">{playerName}</p>
      {position && (
        <p className="text-gray-500 mb-1.5">{position}</p>
      )}
      <p className="tabular-nums">
        <span className="font-medium" style={{ color: barColour(attendanceRate) }}>
          {attendanceRate}%
        </span>
        {' '}attendance
      </p>
      <p className="text-gray-500 tabular-nums">
        {presentCount} present / {totalEvents} events
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlayerAttendanceChart({ data }: PlayerAttendanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No player attendance data yet.
      </div>
    );
  }

  // Calculate chart height dynamically based on player count.
  // Each bar row is ~32px with padding; minimum of 200px.
  const chartHeight = Math.max(200, data.length * 32);

  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            horizontal={false}
            strokeDasharray="3 3"
            stroke="#e5e7eb"
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickCount={6}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="playerName"
            width={140}
            tick={{ fontSize: 12, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<AttendanceTooltip />}
            cursor={{ fill: '#f3f4f6' }}
          />
          <Bar dataKey="attendanceRate" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((entry) => (
              <Cell
                key={entry.playerId}
                fill={barColour(entry.attendanceRate)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
