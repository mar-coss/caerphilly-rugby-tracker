'use client';

/**
 * Dialog wrapper around PlayerForm.
 *
 * Manages the open/close state and refreshes the page via router.refresh()
 * after a successful mutation so the server component re-fetches the latest
 * player list without a full navigation.
 */

import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { PlayerForm } from './PlayerForm';
import type { Player } from '@/types';

interface PlayerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the dialog is in edit mode; otherwise it is in create mode. */
  player?: Player;
}

export function PlayerFormDialog({
  isOpen,
  onClose,
  player,
}: PlayerFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(player);

  function handleSuccess() {
    onClose();
    // Re-fetch the server component data without a full page navigation.
    router.refresh();
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit player' : 'Add player'}
      description={
        isEditing
          ? `Editing ${player!.full_name}`
          : 'Fill in the details below to add a new player to the roster.'
      }
      size="lg"
    >
      <PlayerForm
        player={player}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Dialog>
  );
}
