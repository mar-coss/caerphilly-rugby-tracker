'use client';

/**
 * Add / Edit coach form.
 *
 * Mirrors the PlayerForm pattern. Submits to createCoach or updateCoach
 * depending on whether a coach prop is supplied.
 */

import { useState, useTransition } from 'react';
import { FormField, inputClasses, inputErrorClasses } from '@/components/ui/FormField';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { createCoach, updateCoach } from '@/app/(dashboard)/coaches/actions';
import type { Coach } from '@/types';
import type { CoachRole } from '@/types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES: CoachRole[] = [
  'Head Coach',
  'Assistant Coach',
  'Forwards Coach',
  'Backs Coach',
  'Strength & Conditioning',
  'Team Manager',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldErrors = Partial<Record<string, string>>;

interface CoachFormProps {
  coach?: Coach;
  onSuccess: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoachForm({ coach, onSuccess, onCancel }: CoachFormProps) {
  const isEditing = Boolean(coach);
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
      const result = isEditing
        ? await updateCoach(coach!.id, formData)
        : await createCoach(formData);

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
        {/* First name */}
        <FormField
          label="First name"
          htmlFor="first_name"
          error={fieldErrors.first_name}
          required
        >
          <input
            id="first_name"
            name="first_name"
            type="text"
            autoComplete="given-name"
            required
            defaultValue={coach?.first_name ?? ''}
            disabled={isPending}
            aria-describedby={fieldErrors.first_name ? 'first_name-error' : undefined}
            className={cn(inputClasses, fieldErrors.first_name && inputErrorClasses)}
          />
        </FormField>

        {/* Last name */}
        <FormField
          label="Last name"
          htmlFor="last_name"
          error={fieldErrors.last_name}
          required
        >
          <input
            id="last_name"
            name="last_name"
            type="text"
            autoComplete="family-name"
            required
            defaultValue={coach?.last_name ?? ''}
            disabled={isPending}
            aria-describedby={fieldErrors.last_name ? 'last_name-error' : undefined}
            className={cn(inputClasses, fieldErrors.last_name && inputErrorClasses)}
          />
        </FormField>

        {/* Role */}
        <FormField
          label="Role"
          htmlFor="role"
          error={fieldErrors.role}
          required
          className="sm:col-span-2"
        >
          <select
            id="role"
            name="role"
            defaultValue={coach?.role ?? ''}
            disabled={isPending}
            aria-describedby={fieldErrors.role ? 'role-error' : undefined}
            className={cn(inputClasses, fieldErrors.role && inputErrorClasses)}
          >
            <option value="">— Select role —</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </FormField>

        {/* Email */}
        <FormField
          label="Email"
          htmlFor="email"
          error={fieldErrors.email}
        >
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={coach?.email ?? ''}
            disabled={isPending}
            placeholder="coach@example.com"
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className={cn(inputClasses, fieldErrors.email && inputErrorClasses)}
          />
        </FormField>

        {/* Phone */}
        <FormField label="Phone" htmlFor="phone">
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={coach?.phone ?? ''}
            disabled={isPending}
            placeholder="+44 7700 900000"
            className={inputClasses}
          />
        </FormField>
      </div>

      {/* Notes */}
      <FormField label="Notes" htmlFor="notes" className="mt-4">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={coach?.notes ?? ''}
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
          {isPending
            ? isEditing ? 'Saving…' : 'Adding…'
            : isEditing ? 'Save changes' : 'Add coach'
          }
        </button>
      </div>
    </form>
  );
}
