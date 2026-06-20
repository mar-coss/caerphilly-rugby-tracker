/**
 * Reusable form field wrapper.
 *
 * Renders a <label>, an <input> or <select> (via children), and an optional
 * inline error message. Keeps label + error wiring consistent across all forms
 * without duplicating boilerplate in every component.
 */

import { cn } from '@/lib/utils';

interface FormFieldProps {
  /** The <label> text. */
  label: string;
  /** Must match the id of the input/select child element. */
  htmlFor: string;
  /** Validation error message. Shown in red below the field when provided. */
  error?: string;
  /** Whether the field is required (appends * to the label). */
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  className,
  children,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`;

  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Shared className string for all text inputs and selects in forms.
 *
 * `text-base` on mobile prevents iOS Safari from auto-zooming when the input
 * is tapped (iOS zooms into any input with font-size < 16px). `sm:text-sm`
 * restores the design-system size on larger screens.
 */
export const inputClasses = `
  block w-full rounded-md border border-gray-300 px-3 py-2.5 text-base sm:text-sm
  placeholder:text-gray-400
  focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent
  disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
`.trim();

/** Additional classes applied when a field has a validation error. */
export const inputErrorClasses = 'border-red-400 focus:ring-red-500';
