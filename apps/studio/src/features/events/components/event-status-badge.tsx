import type { EventStatus } from '@playora/contracts';
import { Badge, LiveDot } from '@playora/ui/components/badge';
import { useTranslations } from 'next-intl';

const VARIANT = {
  draft: 'outline',
  scheduled: 'info',
  live: 'live',
  ended: 'secondary',
  archived: 'ghost',
} as const satisfies Record<EventStatus, string>;

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const t = useTranslations('events.statuses');
  return (
    <Badge
      variant={VARIANT[status]}
      className={status === 'archived' ? 'text-muted-foreground' : ''}
    >
      {status === 'live' && <LiveDot />}
      {t(status)}
    </Badge>
  );
}
