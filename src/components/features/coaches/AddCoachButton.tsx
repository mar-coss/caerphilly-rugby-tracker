'use client';

/**
 * "Add coach" button that opens the create-coach dialog.
 *
 * A small client island so the parent Coaches page can stay a server component.
 */

import { useState } from 'react';
import { CoachFormDialog } from './CoachFormDialog';

export function AddCoachButton() {
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
        Add coach
      </button>

      <CoachFormDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
