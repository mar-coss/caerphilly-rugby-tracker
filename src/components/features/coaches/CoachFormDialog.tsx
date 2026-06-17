'use client';

/**
 * Dialog wrapper around CoachForm.
 *
 * Mirrors the PlayerFormDialog pattern exactly. Calls router.refresh() on
 * success to re-fetch the server-rendered coaches list.
 */

import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { CoachForm } from './CoachForm';
import type { Coach } from '@/types';

interface CoachFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  coach?: Coach;
}

export function CoachFormDialog({ isOpen, onClose, coach }: CoachFormDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(coach);

  function handleSuccess() {
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit coach' : 'Add coach'}
      description={
        isEditing
          ? `Editing ${coach!.full_name}`
          : 'Fill in the details below to add a new coach.'
      }
      size="md"
    >
      <CoachForm
        coach={coach}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Dialog>
  );
}
