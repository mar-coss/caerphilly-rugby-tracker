'use client';

/**
 * "Add player" button that opens the create-player dialog.
 *
 * Extracted as a client component so the Players page (a server component) can
 * place this button in the page header without making the entire page a client
 * component. State management stays local to this small island.
 */

import { useState } from 'react';
import { PlayerFormDialog } from './PlayerFormDialog';

export function AddPlayerButton() {
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
        Add player
      </button>

      <PlayerFormDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
