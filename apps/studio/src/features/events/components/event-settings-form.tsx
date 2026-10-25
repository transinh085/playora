'use client';

import {
  type BrandKitSummary,
  type ErrorCode,
  type EventSummary,
  UpdateEventBody,
} from '@playora/contracts';
import { applyApiError, useZodForm } from '@playora/ui/form';
import { App, Button, Form, Skeleton } from 'antd';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { z } from 'zod';
import { QueryError } from '@/components/query-error';
import { useBrandKits } from '@/features/brand-kits/api';
import { useEvent, useUpdateEvent } from '../api';
import { EventGeneralSection, EventScheduleSection } from './event-settings-form-general';
import { EventRegistrationSection, PARTICIPATION_MODES } from './event-settings-form-registration';

type Values = z.input<typeof UpdateEventBody>;

export function toEventSettingsFormValues(event: EventSummary): Values {
  const identity = (PARTICIPATION_MODES as readonly string[]).includes(event.identity)
    ? event.identity
    : 'anonymous';

  return {
    name: event.name,
    brandKitId: event.brandKitId,
    status: event.status,
    identity,
    timezone: event.timezone,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    playerLimit: event.playerLimit,
    registrationForm: {
      fields: event.registrationForm?.fields ?? [],
      consents: event.registrationForm?.consents ?? [],
    },
  };
}

export function EventSettingsForm({ orgId, eventId }: { orgId: string; eventId: string }) {
  const eventQuery = useEvent(orgId, eventId);
  const kitsQuery = useBrandKits(orgId, 100);

  if (eventQuery.isPending || kitsQuery.isPending) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (eventQuery.isError || !eventQuery.data) {
    return <QueryError onRetry={() => eventQuery.refetch()} />;
  }

  return (
    <EventSettingsFormInner
      key={`${eventQuery.data.id}:${eventQuery.data.updatedAt}`}
      orgId={orgId}
      event={eventQuery.data}
      brandKits={kitsQuery.data?.items ?? []}
    />
  );
}

export function EventSettingsFormInner({
  orgId,
  event,
  brandKits,
}: {
  orgId: string;
  event: EventSummary;
  brandKits: BrandKitSummary[];
}) {
  const t = useTranslations();
  const { message } = App.useApp();

  const { form, rules, parse } = useZodForm(UpdateEventBody);

  const initialValues = useMemo<Values>(() => toEventSettingsFormValues(event), [event]);

  const update = useUpdateEvent({
    onSuccess: () => {
      message.success(t('events.saved'));
    },
    onError: (err) => {
      const messageFor = (code: ErrorCode) => t(`errors.${code}`);
      if (!applyApiError(form, err, messageFor)) {
        message.error(messageFor(err.code));
      }
    },
  });

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      className="grid gap-6"
      onFinish={(values) => {
        const currentFields =
          values.registrationForm?.fields ??
          form.getFieldValue(['registrationForm', 'fields']) ??
          [];
        const currentConsents =
          values.registrationForm?.consents ??
          form.getFieldValue(['registrationForm', 'consents']) ??
          [];
        const body = parse({
          ...values,
          registrationForm: {
            fields: currentFields,
            consents: currentConsents,
          },
        });
        update.mutate({ params: { orgId, eventId: event.id }, body });
      }}
    >
      <EventGeneralSection eventName={event.name} brandKits={brandKits} rules={rules} />

      <EventScheduleSection currentTimezone={event.timezone} rules={rules} />

      <EventRegistrationSection
        form={form}
        rules={rules}
        initialFields={initialValues.registrationForm?.fields}
        initialConsents={initialValues.registrationForm?.consents}
      />

      <div className="flex justify-end">
        <Button type="primary" htmlType="submit" loading={update.isPending}>
          {t('common.save')}
        </Button>
      </div>
    </Form>
  );
}
