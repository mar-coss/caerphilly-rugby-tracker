/**
 * Auto-generated-style type definitions for the Supabase database schema.
 *
 * These types mirror the database tables exactly. Use these as the source of
 * truth for all database interactions. Application-level types (with relations
 * joined) are defined separately in domain.ts.
 */

export type PlayerPosition =
  | 'Loosehead Prop'
  | 'Hooker'
  | 'Tighthead Prop'
  | 'Lock'
  | 'Blindside Flanker'
  | 'Openside Flanker'
  | 'Number 8'
  | 'Scrum Half'
  | 'Fly Half'
  | 'Left Wing'
  | 'Inside Centre'
  | 'Outside Centre'
  | 'Right Wing'
  | 'Fullback';

export type PlayerStatus = 'active' | 'inactive' | 'injured' | 'suspended';

export type CoachRole =
  | 'Head Coach'
  | 'Assistant Coach'
  | 'Forwards Coach'
  | 'Backs Coach'
  | 'Strength & Conditioning'
  | 'Team Manager';

export type EventType = 'training' | 'match' | 'meeting' | 'other';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'injured' | 'excused';

// ---------------------------------------------------------------------------
// Row types (what comes back from SELECT queries)
// ---------------------------------------------------------------------------

/**
 * Row types are declared as `type` aliases rather than `interface` so they
 * are assignable to `Record<string, unknown>` in TypeScript strict mode.
 * This is required by the Supabase postgrest-js `GenericTable` constraint
 * (Row: Record<string, unknown>) — interfaces are not assignable to
 * `Record<string, unknown>` in TypeScript 5.x strict mode due to implicit
 * index signature incompatibility.
 */

export type PlayerRow = {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  position: PlayerPosition | null;
  squad_number: number | null;
  status: PlayerStatus;
  notes: string | null;
};

export type CoachRow = {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: CoachRole;
  notes: string | null;
};

export type EventRow = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  event_type: EventType;
  event_date: string;
  location: string | null;
  notes: string | null;
  is_cancelled: boolean;
};

export type AttendanceRow = {
  id: string;
  created_at: string;
  updated_at: string;
  event_id: string;
  player_id: string | null;
  coach_id: string | null;
  status: AttendanceStatus;
  notes: string | null;
};

// ---------------------------------------------------------------------------
// Insert types (for INSERT statements — omit auto-generated fields)
// ---------------------------------------------------------------------------

export type PlayerInsert = Omit<PlayerRow, 'id' | 'created_at' | 'updated_at'>;
export type CoachInsert = Omit<CoachRow, 'id' | 'created_at' | 'updated_at'>;
export type EventInsert = Omit<EventRow, 'id' | 'created_at' | 'updated_at'>;
export type AttendanceInsert = Omit<AttendanceRow, 'id' | 'created_at' | 'updated_at'>;

// ---------------------------------------------------------------------------
// Update types (all fields optional except the primary key)
// ---------------------------------------------------------------------------

export type PlayerUpdate = Partial<PlayerInsert>;
export type CoachUpdate = Partial<CoachInsert>;
export type EventUpdate = Partial<EventInsert>;
export type AttendanceUpdate = Partial<AttendanceInsert>;

// ---------------------------------------------------------------------------
// Supabase Database generic type (used to type the Supabase client)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      players: {
        Row: PlayerRow;
        Insert: PlayerInsert;
        Update: PlayerUpdate;
        /**
         * Relationships are not yet needed for this app (no foreign key joins
         * are performed via the type system). The empty array satisfies the
         * GenericTable constraint introduced in @supabase/postgrest-js v1.18+.
         */
        Relationships: [];
      };
      coaches: {
        Row: CoachRow;
        Insert: CoachInsert;
        Update: CoachUpdate;
        Relationships: [];
      };
      events: {
        Row: EventRow;
        Insert: EventInsert;
        Update: EventUpdate;
        Relationships: [];
      };
      attendance: {
        Row: AttendanceRow;
        Insert: AttendanceInsert;
        Update: AttendanceUpdate;
        Relationships: [
          {
            foreignKeyName: 'attendance_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coaches';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    /**
     * No database functions (RPC) are used in this app.
     * Record<string, never> is used because it satisfies GenericSchema's
     * Functions: Record<string, GenericFunction> — `never` is assignable to
     * any type including GenericFunction when used as the value type.
     * This is preferred over `{}` which triggers the no-empty-object-type rule.
     */
    Functions: Record<string, never>;
    Enums: {
      player_position: PlayerPosition;
      player_status: PlayerStatus;
      coach_role: CoachRole;
      event_type: EventType;
      attendance_status: AttendanceStatus;
    };
  };
}
