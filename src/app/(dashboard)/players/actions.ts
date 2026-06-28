'use server';

/**
 * Server Actions for player roster management.
 *
 * All mutations go through these actions. They:
 * - Validate input server-side (never trusting client validation)
 * - Interact with Supabase via the server-side client
 * - Return typed ActionResult envelopes so callers handle success/error uniformly
 * - Call revalidatePath so the Next.js cache is invalidated after mutations
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getErrorMessage, logError } from '@/lib/utils';
import type { ActionResult, Player } from '@/types';
import type { PlayerInsert, PlayerUpdate, PlayerPosition, PlayerStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_POSITIONS: PlayerPosition[] = [
  'Loosehead Prop', 'Hooker', 'Tighthead Prop', 'Lock',
  'Blindside Flanker', 'Openside Flanker', 'Number 8',
  'Scrum Half', 'Fly Half', 'Left Wing', 'Inside Centre',
  'Outside Centre', 'Right Wing', 'Fullback',
];

const VALID_STATUSES: PlayerStatus[] = ['active', 'inactive', 'injured', 'suspended'];

interface PlayerFormData {
  first_name: string;
  last_name: string;
  position: string;
  squad_number: string;
  status: string;
  date_of_birth: string;
  email: string;
  phone: string;
  notes: string;
}

interface ValidationErrors {
  first_name?: string;
  last_name?: string;
  position?: string;
  squad_number?: string;
  status?: string;
  email?: string;
}

function validatePlayerForm(data: PlayerFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.first_name.trim()) {
    errors.first_name = 'First name is required.';
  }

  if (!data.last_name.trim()) {
    errors.last_name = 'Last name is required.';
  }

  if (data.position && !VALID_POSITIONS.includes(data.position as PlayerPosition)) {
    errors.position = 'Please select a valid position.';
  }

  if (data.squad_number) {
    const num = Number(data.squad_number);
    if (!Number.isInteger(num) || num < 1 || num > 99) {
      errors.squad_number = 'Squad number must be between 1 and 99.';
    }
  }

  if (data.status && !VALID_STATUSES.includes(data.status as PlayerStatus)) {
    errors.status = 'Please select a valid status.';
  }

  if (data.email && data.email.trim()) {
    // Basic structural email check — the DB doesn't enforce format so we
    // do a lightweight check here.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
  }

  return errors;
}

function extractFormData(formData: FormData): PlayerFormData {
  return {
    first_name:    String(formData.get('first_name') ?? '').trim(),
    last_name:     String(formData.get('last_name') ?? '').trim(),
    position:      String(formData.get('position') ?? '').trim(),
    squad_number:  String(formData.get('squad_number') ?? '').trim(),
    status:        String(formData.get('status') ?? '').trim(),
    date_of_birth: String(formData.get('date_of_birth') ?? '').trim(),
    email:         String(formData.get('email') ?? '').trim(),
    phone:         String(formData.get('phone') ?? '').trim(),
    notes:         String(formData.get('notes') ?? '').trim(),
  };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Creates a new player record.
 *
 * Returns validation errors in the error string so the form can surface them,
 * or the newly created Player on success.
 */
export async function createPlayer(
  formData: FormData,
): Promise<ActionResult<Player>> {
  const raw = extractFormData(formData);
  const errors = validatePlayerForm(raw);

  if (Object.keys(errors).length > 0) {
    return { success: false, error: JSON.stringify(errors) };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const insert: PlayerInsert = {
      first_name:    raw.first_name,
      last_name:     raw.last_name,
      position:      raw.position ? (raw.position as PlayerPosition) : null,
      squad_number:  raw.squad_number ? Number(raw.squad_number) : null,
      status:        (raw.status as PlayerStatus) || 'active',
      date_of_birth: raw.date_of_birth || null,
      email:         raw.email || null,
      phone:         raw.phone || null,
      notes:         raw.notes || null,
    };

    const { data, error } = await supabase
      .from('players')
      .insert(insert)
      .select()
      .single();

    if (error) {
      // Squad number unique violation (code 23505 = unique_violation)
      if (error.code === '23505') {
        const fieldErrors: ValidationErrors = {
          squad_number: 'This squad number is already taken by another active player.',
        };
        return { success: false, error: JSON.stringify(fieldErrors) };
      }
      logError('createPlayer', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/players');
    revalidatePath('/');

    return {
      success: true,
      data: { ...data, full_name: `${data.first_name} ${data.last_name}` },
    };
  } catch (caught) {
    logError('createPlayer', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Updates an existing player record by ID.
 */
export async function updatePlayer(
  playerId: string,
  formData: FormData,
): Promise<ActionResult<Player>> {
  if (!playerId) {
    return { success: false, error: 'Player ID is required.' };
  }

  const raw = extractFormData(formData);
  const errors = validatePlayerForm(raw);

  if (Object.keys(errors).length > 0) {
    return { success: false, error: JSON.stringify(errors) };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const update: PlayerUpdate = {
      first_name:    raw.first_name,
      last_name:     raw.last_name,
      position:      raw.position ? (raw.position as PlayerPosition) : null,
      squad_number:  raw.squad_number ? Number(raw.squad_number) : null,
      status:        (raw.status as PlayerStatus) || 'active',
      date_of_birth: raw.date_of_birth || null,
      email:         raw.email || null,
      phone:         raw.phone || null,
      notes:         raw.notes || null,
    };

    const { data, error } = await supabase
      .from('players')
      .update(update)
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const fieldErrors: ValidationErrors = {
          squad_number: 'This squad number is already taken by another active player.',
        };
        return { success: false, error: JSON.stringify(fieldErrors) };
      }
      logError('updatePlayer', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/players');
    revalidatePath('/');

    return {
      success: true,
      data: { ...data, full_name: `${data.first_name} ${data.last_name}` },
    };
  } catch (caught) {
    logError('updatePlayer', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Deactivates a player by setting their status to 'inactive'.
 * This is a soft delete — the record is retained for attendance history.
 */
export async function deactivatePlayer(
  playerId: string,
): Promise<ActionResult<Player>> {
  if (!playerId) {
    return { success: false, error: 'Player ID is required.' };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('players')
      .update({ status: 'inactive' })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      logError('deactivatePlayer', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/players');
    revalidatePath('/');

    return {
      success: true,
      data: { ...data, full_name: `${data.first_name} ${data.last_name}` },
    };
  } catch (caught) {
    logError('deactivatePlayer', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Reactivates a previously deactivated player by setting their status to 'active'.
 */
export async function reactivatePlayer(
  playerId: string,
): Promise<ActionResult<Player>> {
  if (!playerId) {
    return { success: false, error: 'Player ID is required.' };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('players')
      .update({ status: 'active' })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      logError('reactivatePlayer', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/players');
    revalidatePath('/');

    return {
      success: true,
      data: { ...data, full_name: `${data.first_name} ${data.last_name}` },
    };
  } catch (caught) {
    logError('reactivatePlayer', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Fetches all players ordered by last name then first name.
 */
export async function getPlayers(): Promise<ActionResult<Player[]>> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      logError('getPlayers', error);
      return { success: false, error: getErrorMessage(error) };
    }

    return {
      success: true,
      data: data.map((p) => ({
        ...p,
        full_name: `${p.first_name} ${p.last_name}`,
      })),
    };
  } catch (caught) {
    logError('getPlayers', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}

/**
 * Permanently deletes a player and all associated attendance records.
 */
export async function deletePlayer(
  playerId: string,
): Promise<ActionResult<void>> {
  if (!playerId) {
    return { success: false, error: 'Player ID is required.' };
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      logError('deletePlayer', error);
      return { success: false, error: getErrorMessage(error) };
    }

    revalidatePath('/players');
    revalidatePath('/');
    return { success: true, data: undefined };
  } catch (caught) {
    logError('deletePlayer', caught);
    return { success: false, error: getErrorMessage(caught) };
  }
}
