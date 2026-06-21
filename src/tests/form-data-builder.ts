/**
 * FormData builder helpers for server action tests.
 *
 * Server actions receive a FormData object. These helpers construct
 * FormData instances with typed field sets so tests read like specifications
 * rather than setup boilerplate.
 */

/**
 * Creates a FormData instance from a plain object. Keys with undefined values
 * are omitted (simulating a missing form field).
 */
export function buildFormData(fields: Record<string, string | undefined>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      formData.append(key, value);
    }
  }
  return formData;
}

// ---------------------------------------------------------------------------
// Player form builders
// ---------------------------------------------------------------------------

interface PlayerFields {
  first_name?: string;
  last_name?: string;
  position?: string;
  squad_number?: string;
  status?: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

/**
 * Builds a minimal valid player FormData.
 * Override individual fields by merging overrides on top of the defaults.
 */
export function validPlayerFormData(overrides: PlayerFields = {}): FormData {
  return buildFormData({
    first_name: 'Gethin',
    last_name:  'Jenkins',
    position:   'Loosehead Prop',
    squad_number: '1',
    status:     'active',
    date_of_birth: '',
    email:      '',
    phone:      '',
    notes:      '',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Coach form builders
// ---------------------------------------------------------------------------

interface CoachFields {
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export function validCoachFormData(overrides: CoachFields = {}): FormData {
  return buildFormData({
    first_name: 'Warren',
    last_name:  'Gatland',
    role:       'Head Coach',
    email:      '',
    phone:      '',
    notes:      '',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Event form builders
// ---------------------------------------------------------------------------

interface EventFields {
  title?: string;
  event_type?: string;
  event_date?: string;
  location?: string;
  notes?: string;
}

export function validEventFormData(overrides: EventFields = {}): FormData {
  return buildFormData({
    title:      'Tuesday Training',
    event_type: 'training',
    event_date: '2024-09-10T18:00',
    location:   'Caerphilly RFC Ground',
    notes:      '',
    ...overrides,
  });
}
