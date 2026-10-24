'use client';

import type { BrandKitSummary, EventStatus } from '@playora/contracts';
import { Card, Form, type FormRule, Input, InputNumber, Select, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export const NONE_KIT = '__none__';
export const EVENT_STATUSES: EventStatus[] = ['draft', 'scheduled', 'live', 'ended', 'archived'];

const COMMON_TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'UTC',
] as const;

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(raw: string): string | null {
  if (!raw.trim()) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function IsoDateTimeInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value?: string | null;
  onChange?: (next: string | null) => void;
}) {
  return (
    <Input
      id={id}
      type="datetime-local"
      value={toDatetimeLocalValue(value)}
      onChange={(e) => onChange?.(fromDatetimeLocalValue(e.target.value))}
    />
  );
}

export function EventGeneralSection({
  eventName,
  brandKits,
  rules,
}: {
  eventName: string;
  brandKits: BrandKitSummary[];
  rules: FormRule[];
}) {
  const t = useTranslations();

  const brandKitOptions = useMemo(
    () => [
      { value: NONE_KIT, label: t('events.noBrandKit') },
      ...brandKits.map((kit) => ({ value: kit.id, label: kit.name })),
    ],
    [brandKits, t],
  );

  const statusOptions = useMemo(
    () =>
      EVENT_STATUSES.map((st) => ({
        value: st,
        label: t(`events.statuses.${st}`),
      })),
    [t],
  );

  return (
    <Card title={eventName}>
      <div className="grid gap-4">
        <Form.Item name="name" label={t('events.name')} rules={rules} className="mb-0">
          <Input />
        </Form.Item>

        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item
            name="brandKitId"
            label={t('events.brandKit')}
            rules={rules}
            className="mb-0"
            getValueProps={(v: string | null | undefined) => ({ value: v ?? NONE_KIT })}
            getValueFromEvent={(v: string) => (v === NONE_KIT || !v ? null : v)}
          >
            <Select aria-label={t('events.brandKit')} options={brandKitOptions} />
          </Form.Item>

          <Form.Item name="status" label={t('events.status')} rules={rules} className="mb-0">
            <Select aria-label={t('events.status')} options={statusOptions} />
          </Form.Item>
        </div>
      </div>
    </Card>
  );
}

export function EventScheduleSection({
  currentTimezone,
  rules,
}: {
  currentTimezone?: string;
  rules: FormRule[];
}) {
  const t = useTranslations();

  const timezoneOptions = useMemo(() => {
    const zones = new Set<string>(COMMON_TIMEZONES);
    if (currentTimezone) zones.add(currentTimezone);
    return Array.from(zones).map((tz) => ({ value: tz, label: tz }));
  }, [currentTimezone]);

  return (
    <Card title={t('events.scheduleTitle')}>
      <div className="grid gap-4">
        <Typography.Paragraph type="secondary" className="mb-0 text-sm">
          {t('events.scheduleDescription')}
        </Typography.Paragraph>

        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item name="startsAt" label={t('events.startsAt')} rules={rules} className="mb-0">
            <IsoDateTimeInput />
          </Form.Item>

          <Form.Item name="endsAt" label={t('events.endsAt')} rules={rules} className="mb-0">
            <IsoDateTimeInput />
          </Form.Item>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Form.Item name="timezone" label={t('events.timezone')} rules={rules} className="mb-0">
            <Select aria-label={t('events.timezone')} showSearch options={timezoneOptions} />
          </Form.Item>

          <Form.Item
            name="playerLimit"
            label={t('events.playerLimit')}
            rules={rules}
            className="mb-0"
          >
            <InputNumber min={1} max={100_000} precision={0} className="w-full" />
          </Form.Item>
        </div>
      </div>
    </Card>
  );
}
