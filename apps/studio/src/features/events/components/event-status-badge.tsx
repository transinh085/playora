import type { EventStatus } from '@playora/contracts';
import { Tag } from 'antd';
import { Archive, CircleCheck, Clock, PencilLine, Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Status tag with an icon, so colour is never the only cue (after games-vt's StatusTag). */
const STATUS: Record<EventStatus, { color: string; icon: typeof Clock }> = {
  draft: { color: 'default', icon: PencilLine },
  scheduled: { color: 'processing', icon: Clock },
  live: { color: 'success', icon: Radio },
  ended: { color: 'default', icon: CircleCheck },
  archived: { color: 'default', icon: Archive },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const t = useTranslations('events.statuses');
  const { color, icon: Icon } = STATUS[status];
  return (
    <Tag color={color} icon={<Icon className="mr-1 inline size-3 align-[-2px]" />}>
      {t(status)}
    </Tag>
  );
}
