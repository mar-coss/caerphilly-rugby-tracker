/**
 * Domain types used throughout the application layer.
 *
 * These extend or compose the raw database Row types with joined relations,
 * computed properties, and UI-specific shapes. Keep the database layer
 * (database.ts) clean and stable — put application concerns here.
 */

import type {
  PlayerRow,
  CoachRow,
  EventRow,
  AttendanceRow,
} from './database';

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

/** A player with their full name as a convenience property. */
export type Player = PlayerRow & {
  full_name: string;
};

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------

/** A coach with their full name as a convenience property. */
export type Coach = CoachRow & {
  full_name: string;
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * An event enriched with its attendance summary.
 * Used on event list views where you need at-a-glance attendance counts.
 */
export type EventWithAttendanceSummary = EventRow & {
  attendance_count: number;
  present_count: number;
  absent_count: number;
};

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

/** Attendance record joined with the related player. */
export type AttendanceWithPlayer = AttendanceRow & {
  player: PlayerRow | null;
  coach: CoachRow | null;
};

/** Full attendance sheet for a single event. */
export type EventAttendanceSheet = {
  event: EventRow;
  attendances: AttendanceWithPlayer[];
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Shape of the authenticated admin user stored in session. */
export interface AdminUser {
  id: string;
  email: string;
}

// ---------------------------------------------------------------------------
// API / Server Action response envelopes
// ---------------------------------------------------------------------------

export type ActionSuccess<T> = {
  success: true;
  data: T;
};

export type ActionError = {
  success: false;
  error: string;
};

export type ActionResult<T> = ActionSuccess<T> | ActionError;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Narrows an ActionResult to success. */
export function isActionSuccess<T>(result: ActionResult<T>): result is ActionSuccess<T> {
  return result.success === true;
}

/** Narrows an ActionResult to error. */
export function isActionError<T>(result: ActionResult<T>): result is ActionError {
  return result.success === false;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Form state types (used with useFormState / server actions)
// ---------------------------------------------------------------------------

export type FormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | null;

// ---------------------------------------------------------------------------
// Analytics / Insights
// ---------------------------------------------------------------------------

/**
 * Attendance statistics aggregated per player.
 * Calculated server-side and passed as serialisable props to chart components.
 */
export type PlayerAttendanceStat = {
  playerId: string;
  playerName: string;
  position: string | null;
  totalEvents: number;
  presentCount: number;
  attendanceRate: number; // 0–100
};

/**
 * Attendance rate for the team across a single past event.
 * Used for the trend line chart.
 */
export type TeamAttendanceTrend = {
  eventDate: string;      // ISO date string (date only, no time)
  eventTitle: string;
  attendanceRate: number; // 0–100, present+late / total
  presentCount: number;
  totalCount: number;
};

/**
 * Aggregate breakdown of all attendance records by status.
 * Used for the status distribution pie chart.
 */
export type AttendanceStatusBreakdown = {
  status: string;   // 'present' | 'absent' | 'late' | 'injured' | 'excused'
  count: number;
  percentage: number; // 0–100
};

/**
 * Root shape returned by the analytics query module.
 */
export type AnalyticsData = {
  playerStats: PlayerAttendanceStat[];
  teamTrend: TeamAttendanceTrend[];
  statusBreakdown: AttendanceStatusBreakdown[];
  totalEventsAnalysed: number;
  totalAttendanceRecords: number;
};
