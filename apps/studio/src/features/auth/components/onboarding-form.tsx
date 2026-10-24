'use client';

import { Slug } from '@playora/contracts';
import { useZodForm } from '@playora/ui/form';
import { App, Button, Card, Form, Input } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';

const schema = z.object({ name: z.string().trim().min(2).max(80), slug: Slug });
type Values = z.infer<typeof schema>;

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

export function OnboardingForm() {
  const t = useTranslations('onboarding');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { message } = App.useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { form, rules, parse } = useZodForm(schema);

  async function onSubmit(rawValues: Values) {
    setIsSubmitting(true);
    try {
      const values = parse(rawValues);
      const { data, error } = await authClient.organization.create(values);
      if (error || !data) {
        form.setFields([
          {
            name: 'slug',
            errors: [error?.message ?? tCommon('unknownError')],
          },
        ]);
        return;
      }
      message.success(values.name);
      router.replace(`/orgs/${data.id}/events`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col py-16">
      <Card title={<span className="text-xl font-semibold">{t('title')}</span>}>
        <p className="mb-6 text-sm text-[var(--ant-color-text-secondary)]">{t('description')}</p>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: '', slug: '' }}
          onFinish={onSubmit}
        >
          <Form.Item name="name" label={t('orgName')} rules={rules}>
            <Input
              id="name"
              onChange={(e) => {
                const slug = slugify(e.target.value);
                form.setFieldValue('slug', slug);
                form.validateFields(['slug']).catch(() => {});
              }}
            />
          </Form.Item>
          <Form.Item name="slug" label={t('orgSlug')} rules={rules}>
            <Input id="slug" />
          </Form.Item>
          <Form.Item className="mb-0 mt-6">
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {t('submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
