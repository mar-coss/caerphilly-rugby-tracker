/**
 * Formatting utilities for display values throughout the application.
 */

/**
 * Formats a date string (ISO 8601) into a human-readable UK date format.
 * @example formatDate('2024-03-15') // '15 Mar 2024'
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date-time string into a human-readable UK date + time.
 * @example formatDateTime('2024-03-15T14:30:00') // '15 Mar 2024, 14:30'
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Computes a full name from first and last name parts.
 */
export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Returns initials from a full name (up to 2 characters).
 * @example initials('Marcus Cosslett') // 'MC'
 */
export function initials(firstName: string, lastName: string): string {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName.charAt(0).toUpperCase();
  return `${first}${last}`;
}

/**
 * Formats a squad number for display (pads to 2 digits with a hash prefix).
 * @example formatSquadNumber(7) // '#07'
 */
export function formatSquadNumber(number: number | null | undefined): string {
  if (number == null) return '—';
  return `#${String(number).padStart(2, '0')}`;
}

/**
 * Capitalises the first letter of a string and lowercases the rest.
 */
export function capitalise(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
