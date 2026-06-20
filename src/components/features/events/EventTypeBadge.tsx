/**
 * Domain-specific badge for event types.
 *
 * Maps EventType enum values to appropriate Badge variants and human-readable
 * labels. Colocates the event-type display logic so it never leaks into
 * layout or list components.
 */

import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import type { EventType } from '@/types/database';

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; variant: BadgeVariant }> = {
  training: { label: 'Training',  variant: 'green'  },
  match:    { label: 'Match',     variant: 'blue'   },
  meeting:  { label: 'Meeting',   variant: 'purple' },
  other:    { label: 'Other',     variant: 'gray'   },
};

interface EventTypeBadgeProps {
  type: EventType;
  className?: string;
}

export function EventTypeBadge({ type, className }: EventTypeBadgeProps) {
  const config = EVENT_TYPE_CONFIG[type] ?? EVENT_TYPE_CONFIG.other;
  return <Badge label={config.label} variant={config.variant} className={className} />;
}
