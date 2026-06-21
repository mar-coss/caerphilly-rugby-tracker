/**
 * Unit tests for src/components/ui/FormField.tsx
 *
 * Tests cover label rendering, htmlFor association, required indicator,
 * error message display, error accessibility role, and children pass-through.
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/ui/FormField';

describe('FormField', () => {
  // ---------------------------------------------------------------------------
  // Label
  // ---------------------------------------------------------------------------

  test('renders the label text', () => {
    render(
      <FormField label="First Name" htmlFor="first_name">
        <input id="first_name" />
      </FormField>,
    );
    expect(screen.getByText('First Name')).toBeInTheDocument();
  });

  test('associates the label with the input via htmlFor', () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" type="email" />
      </FormField>,
    );
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email');
  });

  // ---------------------------------------------------------------------------
  // Required indicator
  // ---------------------------------------------------------------------------

  test('does not render the required asterisk by default', () => {
    render(
      <FormField label="Notes" htmlFor="notes">
        <input id="notes" />
      </FormField>,
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  test('renders the required asterisk when required is true', () => {
    render(
      <FormField label="First Name" htmlFor="first_name" required>
        <input id="first_name" />
      </FormField>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('required asterisk has aria-hidden so screen readers skip it', () => {
    render(
      <FormField label="First Name" htmlFor="first_name" required>
        <input id="first_name" />
      </FormField>,
    );
    const asterisk = screen.getByText('*');
    expect(asterisk).toHaveAttribute('aria-hidden', 'true');
  });

  // ---------------------------------------------------------------------------
  // Error message
  // ---------------------------------------------------------------------------

  test('does not render an error paragraph when no error is provided', () => {
    render(
      <FormField label="Notes" htmlFor="notes">
        <input id="notes" />
      </FormField>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('renders the error message when an error string is provided', () => {
    render(
      <FormField label="First Name" htmlFor="first_name" error="First name is required.">
        <input id="first_name" />
      </FormField>,
    );
    expect(screen.getByText('First name is required.')).toBeInTheDocument();
  });

  test('error message has role="alert" for screen reader announcement', () => {
    render(
      <FormField label="First Name" htmlFor="first_name" error="First name is required.">
        <input id="first_name" />
      </FormField>,
    );
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('First name is required.');
  });

  test('error element id is derived from htmlFor (for aria-describedby wiring)', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Invalid email.">
        <input id="email" />
      </FormField>,
    );
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveAttribute('id', 'email-error');
  });

  // ---------------------------------------------------------------------------
  // Children pass-through
  // ---------------------------------------------------------------------------

  test('renders children inside the field wrapper', () => {
    render(
      <FormField label="Position" htmlFor="position">
        <select id="position">
          <option value="">Select</option>
          <option value="Hooker">Hooker</option>
        </select>
      </FormField>,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  test('renders a textarea child correctly', () => {
    render(
      <FormField label="Notes" htmlFor="notes">
        <textarea id="notes" />
      </FormField>,
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // className prop
  // ---------------------------------------------------------------------------

  test('accepts an additional className without error', () => {
    const { container } = render(
      <FormField label="Field" htmlFor="field" className="mt-4">
        <input id="field" />
      </FormField>,
    );
    // The outermost div should carry the extra class.
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
