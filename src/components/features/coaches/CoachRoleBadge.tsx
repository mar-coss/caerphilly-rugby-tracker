/**
 * Renders a coloured badge for a CoachRole value.
 *
 * Centralises the role → colour mapping for consistent display across
 * coaches list and detail views.
 */

import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { CoachRole } from '@/types/database';

const ROLE_VARIANTS: Record<CoachRole, BadgeVariant> = {
  'Head Coach':               'green',
  'Assistant Coach':          'blue',
  'Forwards Coach':           'purple',
  'Backs Coach':              'purple',
  'Strength & Conditioning':  'yellow',
  'Team Manager':             'gray',
};

interface CoachRoleBadgeProps {
  role: CoachRole;
}

export function CoachRoleBadge({ role }: CoachRoleBadgeProps) {
  return <Badge label={role} variant={ROLE_VARIANTS[role]} />;
}
