'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@playora/ui/components/base/buttons/button';
import { Input } from '@playora/ui/components/base/input/input';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@playora/ui/components/base/modal/modal';
import { Select, SelectItem } from '@playora/ui/components/base/select/select';
import { toast } from '@playora/ui/components/base/toast/toast';
import { UserPlus } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { invalidateMembers } = useInvalidateOrgMembers(orgId);

  const defaultRole: OrgRole = assignableRoles.includes('editor')
    ? 'editor'
    : (assignableRoles[0] ?? 'viewer');

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: defaultRole },
  });

  async function onSubmit(rawValues: InviteValues) {
    setIsSubmitting(true);
    try {
      const values = inviteSchema.parse(rawValues);
      const { error } = await authClient.organization.inviteMember({
        organizationId: orgId,
        email: values.email,
        role: values.role as never,
      });
      if (error) {
        form.setError('email', {
          message: error.message ?? t('common.unknownError'),
        });
        return;
      }
      await invalidateMembers();
      toast.success(t('members.invited', { email: values.email }));
      setOpen(false);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        size="small"
        leadingIcon={UserPlus}
        onClick={() => {
          form.reset({ email: '', role: defaultRole });
          setOpen(true);
        }}
      >
        {t('members.invite')}
      </Button>

      <Modal isOpen={open} onOpenChange={setOpen} size="sm">
        <ModalHeader title={t('members.invite')} description={t('members.inviteDescription')} />
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ModalBody className="space-y-4">
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Input
                  label={t('members.email')}
                  type="email"
                  autoComplete="email"
                  value={field.value}
                  onChange={field.onChange}
                  isInvalid={!!fieldState.error}
                  hint={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-1">
                  <span className="text-body-medium text-text-primary">{t('members.role')}</span>
                  <Select
                    aria-label={t('members.role')}
                    selectedKey={field.value}
                    onSelectionChange={(key) => {
                      if (key !== null) field.onChange(String(key) as OrgRole);
                    }}
                  >
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} id={role}>
                        {t(`members.roles.${role}`)}
                      </SelectItem>
                    ))}
                  </Select>
                  {fieldState.error?.message && (
                    <span className="text-caption-1-medium text-text-error-primary">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="secondary" size="small" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="small" disabled={isSubmitting}>
              {t('members.sendInvite')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
