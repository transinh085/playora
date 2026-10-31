'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@playora/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@playora/ui/components/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@playora/ui/components/form';
import { Input } from '@playora/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { toast } from '@playora/ui/components/sonner';
import { Loader2, UserPlus } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
        size="sm"
        className="h-8 rounded-md shadow-xs gap-1.5 text-xs"
        onClick={() => {
          form.reset({ email: '', role: defaultRole });
          setOpen(true);
        }}
      >
        <UserPlus className="size-3.5" />
        {t('members.invite')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-[#0A0A0A]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{t('members.invite')}</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('members.inviteDescription')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">{t('members.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        className="h-8 rounded-md text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">{t('members.role')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger id="invite-role" className="h-8 rounded-md text-xs">
                          <SelectValue placeholder={t('members.role')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-lg">
                        {assignableRoles.map((role) => (
                          <SelectItem key={role} value={role} className="text-xs">
                            {t(`members.roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  onClick={() => setOpen(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 rounded-md text-xs shadow-xs"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  {t('members.sendInvite')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
