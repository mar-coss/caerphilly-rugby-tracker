'use client';

/**
 * Dialog wrapper around EventForm.
 *
 * Manages the open/close state and refreshes the page via router.refresh()
 * after a successful creation so the server component re-fetches the latest
 * event list without a full navigation.
 */

import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/Dialog';
import { EventForm } from './EventForm';

interface EventFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EventFormDialog({ isOpen, onClose }: EventFormDialogProps) {
  const router = useRouter();

  function handleSuccess() {
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create event"
      description="Fill in the details below to create a new event. Attendance rows will be created automatically for all active players."
      size="lg"
    >
      <EventForm onSuccess={handleSuccess} onCancel={onClose} />
    </Dialog>
  );
}
