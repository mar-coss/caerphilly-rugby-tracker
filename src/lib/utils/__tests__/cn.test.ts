/**
 * Unit tests for src/lib/utils/cn.ts
 *
 * cn() is a tiny utility that filters falsy values and joins class names.
 * Tests verify the advertised contract and document edge-case behaviour.
 */

import { describe, test, expect } from 'vitest';
import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  test('joins two plain class name strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  test('filters out false values (conditional classes that are off)', () => {
    expect(cn('base', false, 'active')).toBe('base active');
  });

  test('filters out null values', () => {
    expect(cn('base', null, 'end')).toBe('base end');
  });

  test('filters out undefined values', () => {
    expect(cn('base', undefined, 'end')).toBe('base end');
  });

  test('handles a mix of truthy and falsy values', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('btn', isActive && 'btn-active', isDisabled && 'btn-disabled')).toBe(
      'btn btn-active',
    );
  });

  test('returns an empty string when all values are falsy', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  test('returns an empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });

  test('handles a single truthy class name', () => {
    expect(cn('text-sm')).toBe('text-sm');
  });

  test('preserves Tailwind modifier syntax (colons, brackets) verbatim', () => {
    expect(cn('hover:bg-green-700', 'focus:ring-2', 'md:text-lg')).toBe(
      'hover:bg-green-700 focus:ring-2 md:text-lg',
    );
  });

  test('handles an empty string as a class value (treated as falsy, filtered out)', () => {
    // Empty string is falsy in JS — it should be filtered.
    expect(cn('base', '', 'end')).toBe('base end');
  });

  test('handles extra whitespace within individual class strings (preserves it)', () => {
    // cn does not normalise whitespace within individual tokens — that is the
    // caller's responsibility. This test documents the current behaviour.
    expect(cn('  px-4  ', 'py-2')).toBe('  px-4   py-2');
  });
});
