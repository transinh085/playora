'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  toast,
} from '@playora/ui/components';
import { Copy, UserPlus } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
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
  const copyLinkAfterSendRef = useRef(false);
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
      const { data, error } = await authClient.organization.inviteMember({
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
      if (copyLinkAfterSendRef.current && data?.id && typeof window !== 'undefined') {
        const inviteUrl = `${window.location.origin}/invite/${data.id}`;
        await navigator.clipboard?.writeText(inviteUrl).catch(() => null);
        toast.success(t('members.inviteLinkCopied'));
      } else {
        toast.success(t('members.invited', { email: values.email }));
      }
      setOpen(false);
      form.reset();
    } finally {
      copyLinkAfterSendRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        onPress={() => {
          form.reset({ email: '', role: defaultRole });
          setOpen(true);
        }}
      >
        <UserPlus className="size-4" />
        {t('members.invite')}
      </Button>

      <Modal isOpen={open} onOpenChange={setOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('members.invite')}</Modal.Heading>
                <p className="mt-1 text-caption-1-regular text-text-secondary">
                  {t('members.inviteDescription')}
                </p>
              </Modal.Header>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <Modal.Body className="space-y-4">
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <TextField
                        type="email"
                        value={field.value}
                        onChange={field.onChange}
                        isInvalid={!!fieldState.error}
                        fullWidth
                      >
                        <Label>{t('members.email')}</Label>
                        <Input autoComplete="email" />
                        {fieldState.error?.message && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </TextField>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-1">
                        <Label>{t('members.role')}</Label>
                        <Select
                          aria-label={t('members.role')}
                          selectedKey={field.value}
                          onSelectionChange={(key) => {
                            if (key !== null) field.onChange(String(key) as OrgRole);
                          }}
                          isInvalid={!!fieldState.error}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {assignableRoles.map((role) => (
                                <ListBox.Item
                                  key={role}
                                  id={role}
                                  textValue={t(`members.roles.${role}`)}
                                >
                                  {t(`members.roles.${role}`)}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        {fieldState.error?.message && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </div>
                    )}
                  />
                </Modal.Body>

                <Modal.Footer className="flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onPress={() => setOpen(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    isDisabled={isSubmitting}
                    onPress={() => {
                      copyLinkAfterSendRef.current = true;
                    }}
                  >
                    <Copy className="size-3.5" />
                    {t('members.sendAndCopyLink')}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    isDisabled={isSubmitting}
                    onPress={() => {
                      copyLinkAfterSendRef.current = false;
                    }}
                  >
                    {t('members.sendInvite')}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
