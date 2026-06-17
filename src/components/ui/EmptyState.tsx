/**
 * Empty state display for list views with no data.
 *
 * Provides a consistent visual treatment when a list is empty, with an
 * optional action button to prompt the user to create their first item.
 */

interface EmptyStateProps {
  title: string;
  description: string;
  /** Optional call-to-action label. Rendered as a plain button if supplied. */
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <span className="text-2xl" aria-hidden="true">
          ○
        </span>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="
            mt-6 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white
            hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
            transition-colors duration-150
          "
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
