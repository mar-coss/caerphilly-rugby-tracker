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
 * Permanently deletes a coach record.
 *
 * The coaches table has no is_active column, so there is no soft-delete path.
 * ON DELETE CASCADE on the attendance table removes related records automatically.
 *
 * Known limitation: coach attendance history is lost on deletion.
 * This can be addressed in a future schema migration by adding an is_active column.
 */
export async function deleteCoach(
  coachId: string,
): Promise<ActionResult<void>> {
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
      logError('deleteCoach', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/coaches');
    revalidatePath('/');

    return { success: true, data: undefined };
  } catch (caught) {
    logError('deleteCoach', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Alias for deleteCoach for backwards compatibility.
 * @deprecated Use deleteCoach instead.
 */
export async function deactivateCoach(
  coachId: string,
): Promise<ActionResult<{ id: string }>> {
  const result = await deleteCoach(coachId);
  if (!result.success) {
    return result;
  }
  return { success: true, data: { id: coachId } };
}
