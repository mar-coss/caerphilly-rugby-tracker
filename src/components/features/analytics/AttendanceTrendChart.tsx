'use client';

/**
 * AttendanceTrendChart
 *
 * Line chart showing overall team attendance rate (%) across the last
 * N past events. Helps the coach see whether attendance is improving
 * or declining over time.
 *
 * X-axis: abbreviated event date (e.g. "15 Mar")
 * Y-axis: attendance percentage (0–100%)
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import type { TeamAttendanceTrend } from '@/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AttendanceTrendChartProps {
  data: TeamAttendanceTrend[];
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface TrendTooltipProps {
  active?: boolean;
  // recharts passes payload as an array of data-point wrappers
  payload?: Array<{ payload: TeamAttendanceTrend }>;
  label?: string;
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;

  const { eventTitle, attendanceRate, presentCount, totalCount } = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 mb-1 max-w-[180px] truncate">
        {eventTitle}
      </p>
      <p className="tabular-nums">
        <span className="font-medium text-green-700">{attendanceRate}%</span>
        {' '}attendance
      </p>
      <p className="text-gray-500 tabular-nums">
        {presentCount} present / {totalCount} total
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom dot — colour based on rate
// ---------------------------------------------------------------------------

function RateDot(props: {
  cx?: number;
  cy?: number;
  payload?: TeamAttendanceTrend;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;

  let fill = '#16a34a'; // green
  if (payload.attendanceRate < 80 && payload.attendanceRate >= 50) fill = '#d97706';
  if (payload.attendanceRate < 50) fill = '#dc2626';

  return <Dot cx={cx} cy={cy} r={4} fill={fill} stroke="#fff" strokeWidth={2} />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No past events with attendance records yet.
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="eventDate"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickCount={6}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip content={<TrendTooltip />} />
          {/* Reference lines for the attendance thresholds */}
          <ReferenceLine
            y={80}
            stroke="#16a34a"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: '80%', position: 'insideTopRight', fontSize: 10, fill: '#16a34a' }}
          />
          <ReferenceLine
            y={50}
            stroke="#d97706"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{ value: '50%', position: 'insideTopRight', fontSize: 10, fill: '#d97706' }}
          />
          <Line
            type="monotone"
            dataKey="attendanceRate"
            stroke="#15803d"
            strokeWidth={2.5}
            dot={<RateDot />}
            activeDot={{ r: 6, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
