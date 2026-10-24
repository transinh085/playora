'use client';

import { AssignRandomTeamsBody, type ErrorCode } from '@playora/contracts';
import { applyApiError } from '@playora/ui/form';
import { App, Button, Form, Input, Modal } from 'antd';
import { Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAssignRandomTeams } from '../api';

interface FormValues {
  teams: string;
}

export function RandomTeamsDialog({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const assign = useAssignRandomTeams({
    onSuccess: (res) => {
      message.success(t('guests.assignedSuccess', { count: res.assigned }));
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

  const handleSubmit = (values: FormValues) => {
    const raw = values.teams ?? '';
    const parsedTeams = raw
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    const validation = AssignRandomTeamsBody.safeParse({ teams: parsedTeams });
    if (!validation.success) {
      form.setFields([
        {
          name: 'teams',
          errors: [validation.error.issues[0]?.message ?? t('common.unknownError')],
        },
      ]);
      return;
    }

    assign.mutate({
      params: { orgId, eventId },
      body: validation.data,
    });
  };

  return (
    <>
      <Button icon={<Shuffle className="size-4" />} onClick={() => setOpen(true)}>
        {t('guests.randomTeamsButton')}
      </Button>

      <Modal
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        title={t('guests.randomTeamsTitle')}
        footer={null}
        destroyOnClose
      >
        <p className="mb-4 text-sm text-[var(--ant-color-text-secondary)]">
          {t('guests.randomTeamsDescription')}
        </p>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="teams"
            label={t('guests.teamNamesLabel')}
            rules={[
              {
                validator: async (_, value: string | undefined) => {
                  const raw = value ?? '';
                  const parsedTeams = raw
                    .split(/[\n,]+/)
                    .map((item) => item.trim())
                    .filter(Boolean);
                  const result = AssignRandomTeamsBody.safeParse({ teams: parsedTeams });
                  if (!result.success) {
                    throw new Error(result.error.issues[0]?.message);
                  }
                },
              },
            ]}
          >
            <Input.TextArea id="teams" rows={4} placeholder={t('guests.teamNamesPlaceholder')} />
          </Form.Item>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => {
                setOpen(false);
                form.resetFields();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={assign.isPending}>
              {t('guests.assignSubmit')}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
