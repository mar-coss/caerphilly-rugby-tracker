/**
 * Unit tests for src/components/ui/Badge.tsx
 *
 * We use Testing Library to render the component and assert on the resulting
 * DOM. Tests focus on externally observable behaviour (rendered text, CSS
 * classes, DOM structure) rather than internal implementation.
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';

describe('Badge', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  test('renders the label text', () => {
    render(<Badge label="Active" variant="green" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('renders a <span> element', () => {
    render(<Badge label="Injured" variant="red" />);
    const badge = screen.getByText('Injured');
    expect(badge.tagName).toBe('SPAN');
  });

  // ---------------------------------------------------------------------------
  // Variants — each variant applies a distinct Tailwind colour set
  // ---------------------------------------------------------------------------

  const variants: Array<{ variant: BadgeVariant; expectedClass: string }> = [
    { variant: 'green',  expectedClass: 'bg-green-50'  },
    { variant: 'yellow', expectedClass: 'bg-yellow-50' },
    { variant: 'red',    expectedClass: 'bg-red-50'    },
    { variant: 'blue',   expectedClass: 'bg-blue-50'   },
    { variant: 'purple', expectedClass: 'bg-purple-50' },
    { variant: 'gray',   expectedClass: 'bg-gray-50'   },
  ];

  variants.forEach(({ variant, expectedClass }) => {
    test(`applies the correct background class for variant "${variant}"`, () => {
      render(<Badge label="Label" variant={variant} />);
      const badge = screen.getByText('Label');
      expect(badge).toHaveClass(expectedClass);
    });
  });

  test('applies the ring-inset ring class that gives each badge its border', () => {
    render(<Badge label="Test" variant="green" />);
    expect(screen.getByText('Test')).toHaveClass('ring-1', 'ring-inset');
  });

  test('applies the base structural classes', () => {
    render(<Badge label="Test" variant="blue" />);
    const badge = screen.getByText('Test');
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md');
  });

  // ---------------------------------------------------------------------------
  // className prop (composition)
  // ---------------------------------------------------------------------------

  test('merges an extra className onto the element', () => {
    render(<Badge label="Custom" variant="gray" className="mt-2" />);
    expect(screen.getByText('Custom')).toHaveClass('mt-2');
  });

  test('extra className does not remove base classes', () => {
    render(<Badge label="Custom" variant="gray" className="mt-2" />);
    const badge = screen.getByText('Custom');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('mt-2');
  });

  // ---------------------------------------------------------------------------
  // Different label values
  // ---------------------------------------------------------------------------

  test('renders a numeric-looking label as text', () => {
    render(<Badge label="15" variant="blue" />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  test('renders a label with special characters', () => {
    render(<Badge label="Strength & Conditioning" variant="purple" />);
    expect(screen.getByText('Strength & Conditioning')).toBeInTheDocument();
  });
});
