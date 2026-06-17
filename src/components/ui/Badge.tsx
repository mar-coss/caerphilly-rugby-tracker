/**
 * Generic Badge component for displaying labelled status values.
 *
 * Accepts a variant prop that maps to a Tailwind colour scheme. Use the
 * more specific PlayerStatusBadge / CoachRoleBadge wrappers in feature
 * components so that variant logic stays colocated with domain knowledge.
 */

import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'green'
  | 'yellow'
  | 'red'
  | 'blue'
  | 'purple'
  | 'gray';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  green:  'bg-green-50 text-green-700 ring-green-600/20',
  yellow: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  red:    'bg-red-50 text-red-700 ring-red-600/20',
  blue:   'bg-blue-50 text-blue-700 ring-blue-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  gray:   'bg-gray-50 text-gray-600 ring-gray-500/10',
};

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

export function Badge({ label, variant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
