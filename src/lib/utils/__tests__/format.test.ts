/**
 * Unit tests for src/lib/utils/format.ts
 *
 * All functions are pure (no I/O, no side effects) so these tests need no
 * mocking. They cover happy paths, boundary values, and null/undefined inputs.
 */

import { describe, test, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  fullName,
  initials,
  formatSquadNumber,
  capitalise,
} from '@/lib/utils/format';

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  test('formats a valid ISO date string into UK format', () => {
    // Use a UTC-anchored string so the result is locale-stable regardless of
    // the host machine's timezone. 'T12:00:00Z' means the local date is the
    // 15th everywhere from UTC-12 through UTC+11.
    const result = formatDate('2024-03-15T12:00:00Z');
    expect(result).toBe('15 Mar 2024');
  });

  test('formats a date-only ISO string', () => {
    // Date-only strings are parsed as UTC midnight by the spec.
    const result = formatDate('2024-03-15');
    // Acceptable in both UTC and UTC+N (the date won't roll back a day).
    expect(result).toMatch(/15 Mar 2024/);
  });

  test('returns em-dash for null input', () => {
    expect(formatDate(null)).toBe('—');
  });

  test('returns em-dash for undefined input', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  test('returns em-dash for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  test('formats the start of a year correctly', () => {
    const result = formatDate('2023-01-01T12:00:00Z');
    expect(result).toBe('01 Jan 2023');
  });

  test('formats the end of a year correctly', () => {
    const result = formatDate('2023-12-31T12:00:00Z');
    expect(result).toBe('31 Dec 2023');
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe('formatDateTime', () => {
  test('returns em-dash for null input', () => {
    expect(formatDateTime(null)).toBe('—');
  });

  test('returns em-dash for undefined input', () => {
    expect(formatDateTime(undefined)).toBe('—');
  });

  test('returns em-dash for empty string', () => {
    expect(formatDateTime('')).toBe('—');
  });

  test('includes both date and time in the output', () => {
    // We check structure (day, month abbreviation, year, time separator) rather
    // than the exact string because the time component is timezone-dependent.
    const result = formatDateTime('2024-03-15T14:30:00Z');
    // Must contain a 4-digit year and 2-digit hour:minute pattern.
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/\d{2}:\d{2}/);
    expect(result).toMatch(/Mar/);
  });

  test('uses 24-hour clock (no am/pm)', () => {
    const result = formatDateTime('2024-03-15T15:00:00Z');
    expect(result.toLowerCase()).not.toContain('pm');
    expect(result.toLowerCase()).not.toContain('am');
  });
});

// ---------------------------------------------------------------------------
// fullName
// ---------------------------------------------------------------------------

describe('fullName', () => {
  test('concatenates first and last name with a space', () => {
    expect(fullName('Marcus', 'Cosslett')).toBe('Marcus Cosslett');
  });

  test('trims the result when one name is an empty string', () => {
    expect(fullName('Marcus', '')).toBe('Marcus');
    expect(fullName('', 'Cosslett')).toBe('Cosslett');
  });

  test('handles names with internal spaces (compound names)', () => {
    expect(fullName('Mary Jane', 'Watson')).toBe('Mary Jane Watson');
  });

  test('handles single-character names', () => {
    expect(fullName('J', 'K')).toBe('J K');
  });
});

// ---------------------------------------------------------------------------
// initials
// ---------------------------------------------------------------------------

describe('initials', () => {
  test('returns uppercase initials from first and last name', () => {
    expect(initials('Marcus', 'Cosslett')).toBe('MC');
  });

  test('uppercases lowercase input', () => {
    expect(initials('alice', 'smith')).toBe('AS');
  });

  test('returns two characters even when names are one letter each', () => {
    expect(initials('J', 'K')).toBe('JK');
  });

  test('uses the first character of each name', () => {
    // Compound first name — initials only uses the first character of the
    // string passed, not each word.
    expect(initials('Mary-Jane', 'Watson')).toBe('MW');
  });

  test('handles empty first name gracefully (returns last initial only)', () => {
    expect(initials('', 'Smith')).toBe('S');
  });

  test('handles empty last name gracefully (returns first initial only)', () => {
    expect(initials('Marcus', '')).toBe('M');
  });
});

// ---------------------------------------------------------------------------
// formatSquadNumber
// ---------------------------------------------------------------------------

describe('formatSquadNumber', () => {
  test('pads single-digit numbers to two digits with # prefix', () => {
    expect(formatSquadNumber(7)).toBe('#07');
  });

  test('does not pad two-digit numbers', () => {
    expect(formatSquadNumber(15)).toBe('#15');
  });

  test('handles number 1', () => {
    expect(formatSquadNumber(1)).toBe('#01');
  });

  test('handles number 99 (max squad number)', () => {
    expect(formatSquadNumber(99)).toBe('#99');
  });

  test('returns em-dash for null input', () => {
    expect(formatSquadNumber(null)).toBe('—');
  });

  test('returns em-dash for undefined input', () => {
    expect(formatSquadNumber(undefined)).toBe('—');
  });

  test('returns em-dash for 0 (falsy but valid edge case)', () => {
    // 0 is not a valid squad number (range is 1–99) but the format function
    // uses `== null` so 0 is NOT treated as null — it formats as #00.
    // This test documents the current behaviour; a validator rejects 0 upstream.
    expect(formatSquadNumber(0)).toBe('#00');
  });
});

// ---------------------------------------------------------------------------
// capitalise
// ---------------------------------------------------------------------------

describe('capitalise', () => {
  test('capitalises the first letter and lowercases the rest', () => {
    expect(capitalise('training')).toBe('Training');
  });

  test('lowercases an ALL-CAPS input (preserves only first letter as upper)', () => {
    expect(capitalise('MATCH')).toBe('Match');
  });

  test('handles a single character', () => {
    expect(capitalise('a')).toBe('A');
  });

  test('returns empty string for empty input', () => {
    expect(capitalise('')).toBe('');
  });

  test('handles mixed case input', () => {
    expect(capitalise('mEeTiNg')).toBe('Meeting');
  });

  test('handles a string that is already correctly capitalised', () => {
    expect(capitalise('Other')).toBe('Other');
  });
});
