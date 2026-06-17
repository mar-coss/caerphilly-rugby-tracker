'use client';

/**
 * Add / Edit player form.
 *
 * Used inside the PlayerFormDialog for both create and update flows.
 * The form submits to the appropriate server action based on whether a player
 * is provided (edit) or not (create).
 *
 * Validation errors are surfaced inline next to the relevant fields.
 * The form is disabled while the action is in flight.
 */

import { useState, useTransition } from 'react';
import { FormField, inputClasses, inputErrorClasses } from '@/components/ui/FormField';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { createPlayer, updatePlayer } from '@/app/(dashboard)/players/actions';
import type { Player } from '@/types';
import type { PlayerPosition, PlayerStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POSITIONS: PlayerPosition[] = [
  'Loosehead Prop', 'Hooker', 'Tighthead Prop', 'Lock',
  'Blindside Flanker', 'Openside Flanker', 'Number 8',
  'Scrum Half', 'Fly Half', 'Left Wing', 'Inside Centre',
  'Outside Centre', 'Right Wing', 'Fullback',
];

const STATUSES: { value: PlayerStatus; label: string }[] = [
  { value: 'active',    label: 'Active' },
  { value: 'inactive',  label: 'Inactive' },
  { value: 'injured',   label: 'Injured' },
  { value: 'suspended', label: 'Suspended' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldErrors = Partial<Record<string, string>>;

interface PlayerFormProps {
  /** When provided the form is in edit mode; otherwise it is in create mode. */
  player?: Player;
  onSuccess: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlayerForm({ player, onSuccess, onCancel }: PlayerFormProps) {
  const isEditing = Boolean(player);
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
        ? await updatePlayer(player!.id, formData)
        : await createPlayer(formData);

      if (!result.success) {
        // Try to parse field-level errors (JSON-encoded in the error string).
        try {
          const parsed = JSON.parse(result.error) as FieldErrors;
          setFieldErrors(parsed);
        } catch {
          // Not JSON — it's a general error message.
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
            defaultValue={player?.first_name ?? ''}
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
            defaultValue={player?.last_name ?? ''}
            disabled={isPending}
            aria-describedby={fieldErrors.last_name ? 'last_name-error' : undefined}
            className={cn(inputClasses, fieldErrors.last_name && inputErrorClasses)}
          />
        </FormField>

        {/* Position */}
        <FormField
          label="Position"
          htmlFor="position"
          error={fieldErrors.position}
        >
          <select
            id="position"
            name="position"
            defaultValue={player?.position ?? ''}
            disabled={isPending}
            className={cn(inputClasses, fieldErrors.position && inputErrorClasses)}
          >
            <option value="">— Select position —</option>
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </FormField>

        {/* Squad number */}
        <FormField
          label="Squad number"
          htmlFor="squad_number"
          error={fieldErrors.squad_number}
        >
          <input
            id="squad_number"
            name="squad_number"
            type="number"
            min="1"
            max="99"
            defaultValue={player?.squad_number ?? ''}
            disabled={isPending}
            placeholder="e.g. 10"
            aria-describedby={fieldErrors.squad_number ? 'squad_number-error' : undefined}
            className={cn(inputClasses, fieldErrors.squad_number && inputErrorClasses)}
          />
        </FormField>

        {/* Status */}
        <FormField
          label="Status"
          htmlFor="status"
          error={fieldErrors.status}
          required
        >
          <select
            id="status"
            name="status"
            defaultValue={player?.status ?? 'active'}
            disabled={isPending}
            className={cn(inputClasses, fieldErrors.status && inputErrorClasses)}
          >
            {STATUSES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Date of birth */}
        <FormField label="Date of birth" htmlFor="date_of_birth">
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={player?.date_of_birth ?? ''}
            disabled={isPending}
            className={inputClasses}
          />
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
            defaultValue={player?.email ?? ''}
            disabled={isPending}
            placeholder="player@example.com"
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
            defaultValue={player?.phone ?? ''}
            disabled={isPending}
            placeholder="+44 7700 900000"
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
          defaultValue={player?.notes ?? ''}
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
            : isEditing ? 'Save changes' : 'Add player'
          }
        </button>
      </div>
    </form>
  );
}
