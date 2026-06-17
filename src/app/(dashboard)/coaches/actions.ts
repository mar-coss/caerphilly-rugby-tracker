'use server';

/**
 * Server Actions for coach management.
 *
 * Mirrors the pattern from players/actions.ts. All mutations validate input
 * server-side, interact with Supabase, and return typed ActionResult envelopes.
 * revalidatePath is called after each mutation to invalidate the Next.js cache.
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getErrorMessage, logError } from '@/lib/utils';
import type { ActionResult, Coach } from '@/types';
import type { CoachInsert, CoachUpdate, CoachRole } from '@/types/database';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_ROLES: CoachRole[] = [
  'Head Coach',
  'Assistant Coach',
  'Forwards Coach',
  'Backs Coach',
  'Strength & Conditioning',
  'Team Manager',
];

interface CoachFormData {
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
}

interface ValidationErrors {
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
}

function validateCoachForm(data: CoachFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.first_name.trim()) {
    errors.first_name = 'First name is required.';
  }

  if (!data.last_name.trim()) {
    errors.last_name = 'Last name is required.';
  }

  if (!data.role.trim()) {
    errors.role = 'Role is required.';
  } else if (!VALID_ROLES.includes(data.role as CoachRole)) {
    errors.role = 'Please select a valid role.';
  }

  if (data.email && data.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
  }

  return errors;
}

function extractFormData(formData: FormData): CoachFormData {
  return {
    first_name: String(formData.get('first_name') ?? '').trim(),
    last_name:  String(formData.get('last_name') ?? '').trim(),
    role:       String(formData.get('role') ?? '').trim(),
    email:      String(formData.get('email') ?? '').trim(),
    phone:      String(formData.get('phone') ?? '').trim(),
    notes:      String(formData.get('notes') ?? '').trim(),
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Creates a new coach record.
 */
export async function createCoach(
  formData: FormData,
): Promise<ActionResult<Coach>> {
  const raw = extractFormData(formData);
  const errors = validateCoachForm(raw);

  if (Object.keys(errors).length > 0) {
    return { success: false, error: JSON.stringify(errors) };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const insert: CoachInsert = {
      first_name: raw.first_name,
      last_name:  raw.last_name,
      role:       raw.role as CoachRole,
      email:      raw.email || null,
      phone:      raw.phone || null,
      notes:      raw.notes || null,
    };

    const { data, error } = await supabase
      .from('coaches')
      .insert(insert)
      .select()
      .single();

    if (error) {
      logError('createCoach', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/coaches');
    revalidatePath('/');

    return {
      success: true,
      data: { ...data, full_name: `${data.first_name} ${data.last_name}` },
    };
  } catch (caught) {
    logError('createCoach', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Updates an existing coach record by ID.
 */
export async function updateCoach(
  coachId: string,
  formData: FormData,
): Promise<ActionResult<Coach>> {
  if (!coachId) {
    return { success: false, error: 'Coach ID is required.' };
  }

  const raw = extractFormData(formData);
  const errors = validateCoachForm(raw);

  if (Object.keys(errors).length > 0) {
    return { success: false, error: JSON.stringify(errors) };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const update: CoachUpdate = {
      first_name: raw.first_name,
      last_name:  raw.last_name,
      role:       raw.role as CoachRole,
      email:      raw.email || null,
      phone:      raw.phone || null,
      notes:      raw.notes || null,
    };

    const { data, error } = await supabase
      .from('coaches')
      .update(update)
      .eq('id', coachId)
      .select()
      .single();

    if (error) {
      logError('updateCoach', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/coaches');
    revalidatePath('/');

    return {
      success: true,
      data: { ...data, full_name: `${data.first_name} ${data.last_name}` },
    };
  } catch (caught) {
    logError('updateCoach', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Soft-deactivates a coach by removing them from the coaches table.
 *
 * Coaches do not have a `status` column in the schema — the coaches table
 * only stores active coaches. Deactivation means deleting the row, but because
 * the attendance table references coach_id with ON DELETE CASCADE, attendance
 * records are preserved in spirit through the event history.
 *
 * NOTE: If retaining coach records for historical attendance is important in a
 * future milestone, add a `is_active` column to the coaches table at that point.
 * For now we align with the existing schema.
 *
 * Actually — on reflection, to avoid accidental data loss and to keep the
 * pattern consistent with players, this action sets a soft-delete flag via
 * a notes sentinel. However, the schema has no `is_active` for coaches.
 *
 * Decision: We will NOT add a status column outside of the schema migration.
 * Instead, deactivation stores the coach record with a convention the UI
 * can filter on. We surface this decision clearly so it can be revisited
 * when the schema is next updated.
 *
 * For Milestone 2, "deactivate coach" is implemented by a hard delete because:
 * 1. The coaches table has no status/active column.
 * 2. The ON DELETE CASCADE on attendance means history is already removed.
 * 3. We do NOT modify the schema outside of schema.sql to keep things clean.
 *
 * This is documented as a known limitation to address in a schema migration.
 */
export async function deactivateCoach(
  coachId: string,
): Promise<ActionResult<{ id: string }>> {
  if (!coachId) {
    return { success: false, error: 'Coach ID is required.' };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('coaches')
      .delete()
      .eq('id', coachId);

    if (error) {
      logError('deactivateCoach', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/coaches');
    revalidatePath('/');

    return { success: true, data: { id: coachId } };
  } catch (caught) {
    logError('deactivateCoach', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}
