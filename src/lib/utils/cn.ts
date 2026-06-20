/**
 * Class name utility for conditionally joining Tailwind CSS class names.
 *
 * A lightweight implementation that avoids the clsx/tailwind-merge dependency
 * at this stage. If class conflicts become a problem (e.g. overriding base
 * button colours), consider adding tailwind-merge.
 */

type ClassValue = string | boolean | null | undefined;

/**
 * Joins class names together, filtering out falsy values.
 *
 * @example
 * cn('px-4', isActive && 'bg-green-500', undefined) // 'px-4 bg-green-500'
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
