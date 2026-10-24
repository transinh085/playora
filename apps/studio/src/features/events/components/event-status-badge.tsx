import type { EventStatus } from '@playora/contracts';
import { Tag } from 'antd';
import { useTranslations } from 'next-intl';

const COLOR_MAP: Record<EventStatus, string | undefined> = {
  draft: 'default',
  scheduled: 'processing',
  live: 'success',
  ended: 'default',
  archived: 'default',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const t = useTranslations('events.statuses');
  return (
    <Tag color={COLOR_MAP[status]} variant="filled">
      {t(status)}
    </Tag>
  );
}
