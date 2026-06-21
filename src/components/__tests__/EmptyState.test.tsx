/**
 * Unit tests for src/components/ui/EmptyState.tsx
 *
 * Covers: title/description rendering, optional CTA button, and the case
 * where a CTA label is provided without a handler (button must not render).
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  // ---------------------------------------------------------------------------
  // Required content
  // ---------------------------------------------------------------------------

  test('renders the title text', () => {
    render(
      <EmptyState title="No players yet" description="Add your first player to get started." />,
    );
    expect(screen.getByText('No players yet')).toBeInTheDocument();
  });

  test('renders the description text', () => {
    render(
      <EmptyState title="No players yet" description="Add your first player to get started." />,
    );
    expect(
      screen.getByText('Add your first player to get started.'),
    ).toBeInTheDocument();
  });

  test('renders the title in an h3 element', () => {
    render(<EmptyState title="No events" description="Create your first event." />);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('No events');
  });

  // ---------------------------------------------------------------------------
  // Decorative icon
  // ---------------------------------------------------------------------------

  test('renders the decorative icon container', () => {
    render(<EmptyState title="Empty" description="Nothing here." />);
    // The icon has aria-hidden so it is not reachable by assistive-tech queries.
    // We find it by its rendered text content.
    expect(screen.getByText('○')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Optional CTA button
  // ---------------------------------------------------------------------------

  test('does not render a button when no actionLabel is provided', () => {
    render(<EmptyState title="Empty" description="Nothing here." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('does not render a button when actionLabel is provided but onAction is not', () => {
    render(
      <EmptyState title="Empty" description="Nothing here." actionLabel="Add Item" />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('renders a button with the action label when both actionLabel and onAction are provided', () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing here."
        actionLabel="Add Player"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add Player' })).toBeInTheDocument();
  });

  test('calls onAction when the CTA button is clicked', async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();

    render(
      <EmptyState
        title="Empty"
        description="Nothing here."
        actionLabel="Add Player"
        onAction={handleAction}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add Player' }));

    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  test('button has type="button" to avoid accidental form submission', () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing here."
        actionLabel="Add"
        onAction={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('type', 'button');
  });
});
