/**
 * Renders a coloured badge for a PlayerStatus value.
 *
 * Centralises the status → colour mapping so it never drifts out of sync
 * between the list view and any detail views.
 */

import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { PlayerStatus } from '@/types/database';

const STATUS_VARIANTS: Record<PlayerStatus, BadgeVariant> = {
  active:    'green',
  inactive:  'gray',
  injured:   'yellow',
  suspended: 'red',
};

const STATUS_LABELS: Record<PlayerStatus, string> = {
  active:    'Active',
  inactive:  'Inactive',
  injured:   'Injured',
  suspended: 'Suspended',
};

interface PlayerStatusBadgeProps {
  status: PlayerStatus;
}

export function PlayerStatusBadge({ status }: PlayerStatusBadgeProps) {
  return (
    <Badge
      label={STATUS_LABELS[status]}
      variant={STATUS_VARIANTS[status]}
    />
  );
}
