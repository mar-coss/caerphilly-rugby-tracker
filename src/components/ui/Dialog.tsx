'use client';

/**
 * Accessible modal dialog component.
 *
 * Implements the WAI-ARIA dialog pattern:
 * - role="dialog" with aria-modal and aria-labelledby
 * - Focus is trapped inside while open (via the <dialog> HTML element behaviour)
 * - Closes on Escape key (native <dialog> behaviour)
 * - Closes when clicking the backdrop overlay
 *
 * Uses the native <dialog> element for correct focus management and Escape
 * key handling without a third-party library.
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Optional description shown beneath the title. */
  description?: string;
  children: React.ReactNode;
  /** Controls the max-width of the dialog panel. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = 'dialog-title';

  // Sync the open/closed state with the native <dialog> element.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Sync close events triggered by the Escape key back to parent state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => onClose();
    dialog.addEventListener('close', handleNativeClose);
    return () => dialog.removeEventListener('close', handleNativeClose);
  }, [onClose]);

  // Close when clicking the backdrop (the area outside the panel).
  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const isInsidePanel =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!isInsidePanel) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onClick={handleBackdropClick}
      className={cn(
        // Reset browser default <dialog> styles
        'p-0 bg-transparent backdrop:bg-black/40 backdrop:backdrop-blur-sm',
        // Centering — native <dialog> is centred in the viewport
        'rounded-xl shadow-xl',
        'w-full',
        SIZE_CLASSES[size],
      )}
    >
      <div className="bg-white rounded-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-gray-900">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="
              -mr-1 -mt-1 ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md
              text-gray-400 hover:bg-gray-100 hover:text-gray-600
              focus:outline-none focus:ring-2 focus:ring-green-600
              transition-colors duration-100
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </dialog>
  );
}
