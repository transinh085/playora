'use client';

import { CreateEventBody, type ErrorCode } from '@playora/contracts';
import { applyApiError, useZodForm } from '@playora/ui/form';
import { App, Button, Form, Input, Modal } from 'antd';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useCreateEvent } from '../api';

export function CreateEventDialog({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);

  const { form, rules, parse } = useZodForm(CreateEventBody);
  const currentSlug = Form.useWatch('slug', form);

  const create = useCreateEvent({
    onSuccess: (event) => {
      message.success(t('events.created', { name: event.name }));
      setOpen(false);
      form.resetFields();
    },
    onError: (error) => {
      const messageFor = (code: ErrorCode) => t(`errors.${code}`);
      if (!applyApiError(form, error, messageFor)) {
        message.error(messageFor(error.code));
      }
    },
  });

  return (
    <>
      <Button type="primary" icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
        {t('events.new')}
      </Button>

      <Modal
        title={t('events.new')}
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: '', slug: '' }}
          onFinish={(values) => {
            const parsed = parse(values);
            create.mutate({ params: { orgId }, body: parsed });
          }}
          className="mt-4"
        >
          <Form.Item name="name" label={t('events.name')} rules={rules}>
            <Input />
          </Form.Item>

          <Form.Item
            name="slug"
            label={t('events.slug')}
            rules={rules}
            extra={
              <span className="text-xs text-[var(--ant-color-text-secondary)]">
                {t('events.slugHint', { slug: currentSlug || 'yep-2026' })}
              </span>
            }
          >
            <Input placeholder="yep-2026" />
          </Form.Item>

          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={create.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
