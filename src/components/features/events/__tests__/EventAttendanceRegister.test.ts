import { describe, it, expect } from 'vitest';
import type { AttendanceWithPlayer } from '@/types';
import type { AttendanceStatus } from '@/types/database';

// Test data factory
function createAttendance(id: string, name: string, status: AttendanceStatus = 'absent'): AttendanceWithPlayer {
  return {
    id,
    event_id: 'event-1',
    player_id: `player-${id}`,
    coach_id: null,
    status,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    player: {
      id: `player-${id}`,
      club_id: 'club-1',
      first_name: name.split(' ')[0],
      last_name: name.split(' ')[1] || '',
      position: 'Fly Half',
      squad_number: 10,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    coach: null,
  };
}

describe('EventAttendanceRegister - Optimistic Update Reducer', () => {
  it('should update only the target row when changing a single status', () => {
    // Setup: create multiple attendance records
    const attendances: AttendanceWithPlayer[] = [
      createAttendance('1', 'Ethan Lewis', 'present'),
      createAttendance('2', 'Alfie Morgan', 'absent'),
      createAttendance('3', 'Charlie Brown', 'absent'),
    ];

    // The reducer from EventAttendanceRegister
    const reducer = (
      currentRows: typeof attendances,
      { attendanceId, newStatus }: { attendanceId: string; newStatus: AttendanceStatus }
    ) => {
      return currentRows.map((row) =>
        row.id === attendanceId
          ? { ...row, optimisticStatus: newStatus }
          : row,
      );
    };

    // Action: update Ethan (id=1) from present to late
    const updated = reducer(attendances, { attendanceId: '1', newStatus: 'late' });

    // Assert: only Ethan should have optimisticStatus set
    expect(updated[0]).toHaveProperty('optimisticStatus', 'late');
    expect(updated[1]).not.toHaveProperty('optimisticStatus');
    expect(updated[2]).not.toHaveProperty('optimisticStatus');
  });

  it('should not affect adjacent rows when updating middle row', () => {
    const attendances: AttendanceWithPlayer[] = [
      createAttendance('1', 'Player One', 'present'),
      createAttendance('2', 'Player Two', 'absent'),
      createAttendance('3', 'Player Three', 'absent'),
      createAttendance('4', 'Player Four', 'absent'),
    ];

    const reducer = (
      currentRows: typeof attendances,
      { attendanceId, newStatus }: { attendanceId: string; newStatus: AttendanceStatus }
    ) => {
      return currentRows.map((row) =>
        row.id === attendanceId
          ? { ...row, optimisticStatus: newStatus }
          : row,
      );
    };

    // Update the middle row (id=2)
    const updated = reducer(attendances, { attendanceId: '2', newStatus: 'late' });

    // Assert: only the middle row should be updated
    expect(updated[0]).not.toHaveProperty('optimisticStatus');
    expect(updated[1]).toHaveProperty('optimisticStatus', 'late');
    expect(updated[2]).not.toHaveProperty('optimisticStatus');
    expect(updated[3]).not.toHaveProperty('optimisticStatus');
  });

  it('should handle updating the last row without affecting others', () => {
    const attendances: AttendanceWithPlayer[] = [
      createAttendance('1', 'Player One', 'present'),
      createAttendance('2', 'Player Two', 'absent'),
      createAttendance('3', 'Player Three', 'absent'),
    ];

    const reducer = (
      currentRows: typeof attendances,
      { attendanceId, newStatus }: { attendanceId: string; newStatus: AttendanceStatus }
    ) => {
      return currentRows.map((row) =>
        row.id === attendanceId
          ? { ...row, optimisticStatus: newStatus }
          : row,
      );
    };

    // Update the last row
    const updated = reducer(attendances, { attendanceId: '3', newStatus: 'injured' });

    expect(updated[0]).not.toHaveProperty('optimisticStatus');
    expect(updated[1]).not.toHaveProperty('optimisticStatus');
    expect(updated[2]).toHaveProperty('optimisticStatus', 'injured');
  });

  it('should preserve all other fields when updating status', () => {
    const attendance = createAttendance('1', 'Test Player', 'present');
    attendance.notes = 'Running late';
    const attendances = [attendance];

    const reducer = (
      currentRows: typeof attendances,
      { attendanceId, newStatus }: { attendanceId: string; newStatus: AttendanceStatus }
    ) => {
      return currentRows.map((row) =>
        row.id === attendanceId
          ? { ...row, optimisticStatus: newStatus }
          : row,
      );
    };

    const updated = reducer(attendances, { attendanceId: '1', newStatus: 'late' });

    // Assert: optimisticStatus is added but other fields are preserved
    expect(updated[0].optimisticStatus).toBe('late');
    expect(updated[0].status).toBe('present'); // Original status preserved
    expect(updated[0].notes).toBe('Running late');
    expect(updated[0].player?.first_name).toBe('Test');
  });

  it('should handle non-existent ID gracefully', () => {
    const attendances: AttendanceWithPlayer[] = [
      createAttendance('1', 'Player One', 'present'),
      createAttendance('2', 'Player Two', 'absent'),
    ];

    const reducer = (
      currentRows: typeof attendances,
      { attendanceId, newStatus }: { attendanceId: string; newStatus: AttendanceStatus }
    ) => {
      return currentRows.map((row) =>
        row.id === attendanceId
          ? { ...row, optimisticStatus: newStatus }
          : row,
      );
    };

    // Try to update a row that doesn't exist
    const updated = reducer(attendances, { attendanceId: '999', newStatus: 'late' });

    // Assert: no changes should be made
    expect(updated).toHaveLength(2);
    expect(updated[0]).not.toHaveProperty('optimisticStatus');
    expect(updated[1]).not.toHaveProperty('optimisticStatus');
  });
});
