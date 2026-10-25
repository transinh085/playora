'use client';

import { ApiError } from '@playora/api-client';
import {
  type BrandKitSummary,
  CreateEventBody,
  type ErrorCode,
  localize,
  type TemplateSkinSummary,
  type TemplateSummary,
} from '@playora/contracts';
import { applyApiError, useZodForm } from '@playora/ui/form';
import { App, Button, Form, Input, Modal, Select, Typography } from 'antd';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCreateEvent } from '@/features/events/api';
import { useCreateGame } from '../api';
import { slugFromName } from '../lib/slug';

/**
 * One-step create from a template (docs/16 §4): name and brand kit are prefilled, the join link
 * is generated, and the user lands in the editor instead of back on a list.
 */
export function QuickCreateDialog({
  orgId,
  template,
  skin,
  brandKits,
  open,
  onClose,
}: {
  orgId: string;
  template: TemplateSummary;
  skin: TemplateSkinSummary;
  brandKits: readonly BrandKitSummary[];
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { message } = App.useApp();
  const { form, rules, parse } = useZodForm(CreateEventBody);
  const [busy, setBusy] = useState(false);
  const createEvent = useCreateEvent();
  const createGame = useCreateGame();
  const messageFor = (code: ErrorCode) => t(`errors.${code}`);
  const templateName = localize(template.name, locale);

  async function submit(values: { name: string; brandKitId?: string | null }) {
    const body = parse({ ...values, slug: slugFromName(values.name) });
    setBusy(true);
    let eventId: string;
    try {
      eventId = (await createEvent.mutateAsync({ params: { orgId }, body })).id;
    } catch (error) {
      setBusy(false);
      if (!applyApiError(form, error, messageFor)) {
        message.error(messageFor(error instanceof ApiError ? error.code : 'INTERNAL'));
      }
      return;
    }
    const base = `/orgs/${orgId}/events/${eventId}`;
    try {
      const game = await createGame.mutateAsync({
        params: { orgId, eventId },
        body: { templateId: template.id, name: values.name, skinKey: skin.key },
      });
      router.push(`${base}/games/${game.id}` as Route);
    } catch {
      message.error(t('templates.create.gameFailed'));
      router.push(`${base}/games` as Route);
    }
  }

  return (
    <Modal
      title={t('templates.create.title', { name: templateName })}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
        initialValues={{
          name: `${templateName} – ${localize(skin.name, locale)}`,
          brandKitId: brandKits[0]?.id,
        }}
        onFinish={submit}
      >
        <Form.Item name="name" label={t('templates.create.name')} rules={rules}>
          <Input data-testid="quick-create-name" />
        </Form.Item>
        <Form.Item name="brandKitId" label={t('templates.create.brandKit')} rules={rules}>
          <Select
            allowClear
            aria-label={t('templates.create.brandKit')}
            placeholder={t('templates.create.noBrandKit')}
            options={brandKits.map((kit) => ({ value: kit.id, label: kit.name }))}
          />
        </Form.Item>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {t('templates.create.linkHint')}
        </Typography.Text>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" htmlType="submit" loading={busy} data-testid="quick-create-submit">
            {t('templates.create.submit')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
