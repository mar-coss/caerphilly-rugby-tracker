/**
 * Accessible loading spinner for async states.
 *
 * Uses an SVG spinner with aria-label so screen readers announce the loading
 * state. The size variant lets callers choose between inline and full-page use.
 */

import { cn } from '@/lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  label = 'Loading…',
  className,
}: LoadingSpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn('inline-block', className)}>
      <svg
        className={cn('animate-spin text-green-700', SIZE_CLASSES[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </span>
  );
}

/**
 * Full-page loading placeholder used while async data is being fetched
 * (for example inside a Suspense boundary).
 */
export function PageLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}
