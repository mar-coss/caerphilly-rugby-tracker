/**
 * Unit tests for src/components/ui/LoadingSpinner.tsx
 *
 * Covers: accessibility attributes, size variants, custom label, and the
 * PageLoadingState compound component.
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, PageLoadingState } from '@/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  test('renders an element with role="status"', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('uses the default aria-label "Loading…" when no label is provided', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Loading…');
  });

  test('uses a custom aria-label when the label prop is provided', () => {
    render(<LoadingSpinner label="Saving changes…" />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Saving changes…');
  });

  test('the inner SVG has aria-hidden to prevent double-announcement', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  // ---------------------------------------------------------------------------
  // Size variants
  // ---------------------------------------------------------------------------

  test('applies the small size class for size="sm"', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });

  test('applies the medium size class for size="md" (default)', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-6', 'w-6');
  });

  test('applies the large size class for size="lg"', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  // ---------------------------------------------------------------------------
  // Styling
  // ---------------------------------------------------------------------------

  test('SVG has the animate-spin class', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });

  test('accepts an extra className on the outer span', () => {
    render(<LoadingSpinner className="ml-2" />);
    const span = screen.getByRole('status');
    expect(span).toHaveClass('ml-2');
  });
});

// ---------------------------------------------------------------------------
// PageLoadingState
// ---------------------------------------------------------------------------

describe('PageLoadingState', () => {
  test('renders a spinner inside a centering wrapper', () => {
    render(<PageLoadingState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('uses the default label "Loading…"', () => {
    render(<PageLoadingState />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Loading…');
  });

  test('accepts a custom label', () => {
    render(<PageLoadingState label="Fetching players…" />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Fetching players…');
  });

  test('renders with the large spinner size', () => {
    const { container } = render(<PageLoadingState />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-8', 'w-8');
  });
});
