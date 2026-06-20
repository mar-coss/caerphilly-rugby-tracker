'use client';

/**
 * Create event form.
 *
 * Used inside the EventFormDialog for the create flow.
 * Submits to the createEvent server action, surfaces field-level and general
 * errors inline, and disables all inputs while the action is in flight.
 *
 * The form captures:
 * - title (required)
 * - event_type (required, select from enum values)
 * - event_date (required, datetime-local — stored as ISO 8601 in the DB)
 * - location (optional)
 * - notes (optional)
 */

import { useState, useTransition } from 'react';
import { FormField, inputClasses, inputErrorClasses } from '@/components/ui/FormField';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { createEvent } from '@/app/(dashboard)/events/actions';
import type { EventType } from '@/types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'training', label: 'Training' },
  { value: 'match',    label: 'Match'    },
  { value: 'meeting',  label: 'Meeting'  },
  { value: 'other',    label: 'Other'    },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldErrors = Partial<Record<string, string>>;

interface EventFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventForm({ onSuccess, onCancel }: EventFormProps) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  function clearErrors() {
    setFieldErrors({});
    setGeneralError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearErrors();

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createEvent(formData);

      if (!result.success) {
        try {
          const parsed = JSON.parse(result.error) as FieldErrors;
          setFieldErrors(parsed);
        } catch {
          setGeneralError(result.error);
        }
        return;
      }

      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* General error */}
      {generalError && (
        <div
          role="alert"
          className="mb-5 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {generalError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Title — full width */}
        <FormField
          label="Title"
          htmlFor="title"
          error={fieldErrors.title}
          required
          className="sm:col-span-2"
        >
          <input
            id="title"
            name="title"
            type="text"
            required
            disabled={isPending}
            placeholder="e.g. Saturday Training Session"
            aria-describedby={fieldErrors.title ? 'title-error' : undefined}
            className={cn(inputClasses, fieldErrors.title && inputErrorClasses)}
          />
        </FormField>

        {/* Event type */}
        <FormField
          label="Event type"
          htmlFor="event_type"
          error={fieldErrors.event_type}
          required
        >
          <select
            id="event_type"
            name="event_type"
            defaultValue="training"
            disabled={isPending}
            aria-describedby={fieldErrors.event_type ? 'event_type-error' : undefined}
            className={cn(inputClasses, fieldErrors.event_type && inputErrorClasses)}
          >
            {EVENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Event date */}
        <FormField
          label="Date and time"
          htmlFor="event_date"
          error={fieldErrors.event_date}
          required
        >
          <input
            id="event_date"
            name="event_date"
            type="datetime-local"
            required
            disabled={isPending}
            aria-describedby={fieldErrors.event_date ? 'event_date-error' : undefined}
            className={cn(inputClasses, fieldErrors.event_date && inputErrorClasses)}
          />
        </FormField>

        {/* Location — full width */}
        <FormField
          label="Location"
          htmlFor="location"
          className="sm:col-span-2"
        >
          <input
            id="location"
            name="location"
            type="text"
            disabled={isPending}
            placeholder="e.g. Caerphilly RFC Ground, Virginia Park"
            className={inputClasses}
          />
        </FormField>
      </div>

      {/* Notes — full width */}
      <FormField label="Notes" htmlFor="notes" className="mt-4">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          disabled={isPending}
          placeholder="Any additional information…"
          className={cn(inputClasses, 'resize-none')}
        />
      </FormField>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="
            rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700
            hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="
            inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white
            hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
        >
          {isPending && <LoadingSpinner size="sm" />}
          {isPending ? 'Creating…' : 'Create event'}
        </button>
      </div>
    </form>
  );
}
