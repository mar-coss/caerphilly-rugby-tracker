/**
 * Unit tests for src/components/ui/Dialog.tsx
 *
 * The Dialog uses the native <dialog> HTML element. jsdom has limited
 * support for showModal() / close() so we mock those methods on the element
 * prototype and verify that the component calls them at the right times.
 *
 * We focus on:
 * 1. Structural rendering (title, description, children, close button)
 * 2. Imperative open/close behaviour via the showModal/close mock
 * 3. The onClose callback fires when the close button is clicked
 * 4. ARIA attributes for screen reader accessibility
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from '@/components/ui/Dialog';

// ---------------------------------------------------------------------------
// jsdom polyfill — the native <dialog> methods are not implemented in jsdom.
// We stub them on the prototype so useEffect calls don't throw.
// ---------------------------------------------------------------------------

let showModalMock: ReturnType<typeof vi.fn>;
let closeMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  showModalMock = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    // Simulate the browser setting the `open` attribute when showModal() is called.
    // This is required so that ARIA accessibility queries can find elements
    // inside the dialog (both happy-dom and jsdom hide dialog contents when
    // the dialog is not open).
    this.setAttribute('open', '');
  });
  closeMock = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });

  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: showModalMock,
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: closeMock,
  });
  // Align the `open` getter with the attribute so the component's isOpen
  // check (dialog.open) reads correctly.
  Object.defineProperty(HTMLDialogElement.prototype, 'open', {
    configurable: true,
    get() {
      return (this as HTMLDialogElement).hasAttribute('open');
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: render the dialog with sensible defaults
// ---------------------------------------------------------------------------

function renderDialog(overrides: Partial<React.ComponentProps<typeof Dialog>> = {}) {
  const defaults: React.ComponentProps<typeof Dialog> = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Dialog',
    children: <p>Dialog content</p>,
  };
  return render(<Dialog {...defaults} {...overrides} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Dialog', () => {
  // Structural rendering

  test('renders the title text', () => {
    renderDialog({ title: 'Add Player' });
    expect(screen.getByText('Add Player')).toBeInTheDocument();
  });

  test('renders children inside the dialog body', () => {
    renderDialog({ children: <p>Form goes here</p> });
    expect(screen.getByText('Form goes here')).toBeInTheDocument();
  });

  test('renders the optional description when provided', () => {
    renderDialog({ description: 'Fill in the player details below.' });
    expect(screen.getByText('Fill in the player details below.')).toBeInTheDocument();
  });

  test('does not render a description element when the prop is omitted', () => {
    renderDialog({ description: undefined });
    expect(screen.queryByText(/Fill in/)).not.toBeInTheDocument();
  });

  test('renders a close button', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  // ARIA attributes

  test('dialog element has aria-modal="true"', () => {
    const { container } = renderDialog();
    const dialog = container.querySelector('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('dialog element has aria-labelledby pointing to the title', () => {
    const { container } = renderDialog();
    const dialog = container.querySelector('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
  });

  test('title heading has id="dialog-title"', () => {
    renderDialog({ title: 'Edit Coach' });
    const heading = screen.getByRole('heading', { name: 'Edit Coach' });
    expect(heading).toHaveAttribute('id', 'dialog-title');
  });

  // Open / close imperative behaviour

  test('calls showModal on mount when isOpen is true', () => {
    renderDialog({ isOpen: true });
    expect(showModalMock).toHaveBeenCalledTimes(1);
  });

  test('does not call showModal on mount when isOpen is false', () => {
    renderDialog({ isOpen: false });
    expect(showModalMock).not.toHaveBeenCalled();
  });

  // onClose callback

  test('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose });

    await user.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Size variants

  test('applies the md max-width class by default', () => {
    const { container } = renderDialog({ size: undefined });
    const dialog = container.querySelector('dialog');
    expect(dialog).toHaveClass('max-w-md');
  });

  test('applies the sm max-width class for size="sm"', () => {
    const { container } = renderDialog({ size: 'sm' });
    const dialog = container.querySelector('dialog');
    expect(dialog).toHaveClass('max-w-sm');
  });

  test('applies the lg max-width class for size="lg"', () => {
    const { container } = renderDialog({ size: 'lg' });
    const dialog = container.querySelector('dialog');
    expect(dialog).toHaveClass('max-w-2xl');
  });
});
