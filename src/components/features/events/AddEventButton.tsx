'use client';

/**
 * "Create event" button that opens the create-event dialog.
 *
 * Extracted as a small client island so the Events page (a server component)
 * can place this in the page header without making the entire page a client
 * component. State management stays local to this component.
 */

import { useState } from 'react';
import { EventFormDialog } from './EventFormDialog';

export function AddEventButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="
          rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white
          hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
          transition-colors duration-150
        "
      >
        Create event
      </button>

      <EventFormDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
