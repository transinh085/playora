'use client';

import { useZodForm } from '@playora/ui/form';
import { App, Button, Flex, Form, Input, Modal, Select, Typography } from 'antd';
import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { z } from 'zod';
import { authClient, ORG_ROLES, type OrgRole } from '@/lib/auth-client';
import { orgMembersQueryKey, useInvalidateOrgMembers } from '../api';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ORG_ROLES),
});
type InviteValues = z.infer<typeof inviteSchema>;

export { orgMembersQueryKey };

export function InviteMemberDialog({
  orgId,
  assignableRoles,
}: {
  orgId: string;
  assignableRoles: readonly OrgRole[];
}) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { invalidateMembers } = useInvalidateOrgMembers(orgId);

  const defaultRole: OrgRole = assignableRoles.includes('editor')
    ? 'editor'
    : (assignableRoles[0] ?? 'viewer');

  const { form, rules, parse } = useZodForm(inviteSchema);

  async function onSubmit(rawValues: InviteValues) {
    setIsSubmitting(true);
    try {
      const values = parse(rawValues);
      const { error } = await authClient.organization.inviteMember({
        organizationId: orgId,
        email: values.email,
        role: values.role as never,
      });
      if (error) {
        form.setFields([
          {
            name: 'email',
            errors: [error.message ?? t('common.unknownError')],
          },
        ]);
        return;
      }
      await invalidateMembers();
      message.success(t('members.invited', { email: values.email }));
      setOpen(false);
      form.resetFields();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button type="primary" icon={<UserPlus className="size-4" />} onClick={() => setOpen(true)}>
        {t('members.invite')}
      </Button>

      <Modal
        title={t('members.invite')}
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          {t('members.inviteDescription')}
        </Typography.Paragraph>

        <Form
          form={form}
          layout="vertical"
          initialValues={{ email: '', role: defaultRole }}
          onFinish={onSubmit}
        >
          <Form.Item name="email" label={t('members.email')} rules={rules}>
            <Input type="email" autoComplete="email" />
          </Form.Item>

          <Form.Item name="role" label={t('members.role')} rules={rules}>
            <Select
              id="invite-role"
              options={assignableRoles.map((role) => ({
                value: role,
                label: t(`members.roles.${role}`),
              }))}
            />
          </Form.Item>

          <Flex justify="end" gap={8} className="mt-6">
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {t('members.sendInvite')}
            </Button>
          </Flex>
        </Form>
      </Modal>
    </>
  );
}
