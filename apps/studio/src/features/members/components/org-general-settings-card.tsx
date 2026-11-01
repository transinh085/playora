'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Slug } from '@playora/contracts';
import {
  Button,
  Card,
  Description,
  FieldError,
  Input,
  Label,
  TextField,
  toast,
} from '@playora/ui/components';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { useInvalidateOrgMembers } from '../api';

const orgSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: Slug,
});

type OrgSettingsValues = z.infer<typeof orgSettingsSchema>;

export function OrgGeneralSettingsCard({
  orgId,
  initialName,
  initialSlug,
  canManage,
}: {
  orgId: string;
  initialName: string;
  initialSlug: string;
  canManage: boolean;
}) {
  const t = useTranslations();
  const [isSaving, setIsSaving] = useState(false);
  const { invalidateMembers, invalidateMyOrgs } = useInvalidateOrgMembers(orgId);

  const form = useForm<OrgSettingsValues>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      name: initialName,
      slug: initialSlug,
    },
  });

  useEffect(() => {
    form.reset({
      name: initialName,
      slug: initialSlug,
    });
  }, [initialName, initialSlug, form]);

  async function onSubmit(rawValues: OrgSettingsValues) {
    if (!canManage) return;
    setIsSaving(true);
    try {
      const values = orgSettingsSchema.parse(rawValues);
      const { error } = await authClient.organization.update({
        organizationId: orgId,
        data: {
          name: values.name,
          slug: values.slug,
        },
      });
      if (error) {
        form.setError('slug', {
          message: error.message ?? t('common.unknownError'),
        });
        return;
      }
      await Promise.all([invalidateMembers(), invalidateMyOrgs()]);
      toast.success(t('members.orgSettings.saved'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card">
      <Card.Header className="border-b border-separator-border px-5 py-3.5">
        <div className="flex flex-col gap-0.5">
          <Card.Title className="m-0 text-body-medium text-text-primary">
            {t('members.orgSettings.title')}
          </Card.Title>
          <Card.Description className="m-0 text-caption-1-regular text-text-secondary">
            {t('members.orgSettings.description')}
          </Card.Description>
        </div>
      </Card.Header>
      <Card.Content className="p-5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  isInvalid={!!fieldState.error}
                  isReadOnly={!canManage}
                  fullWidth
                >
                  <Label>{t('members.orgSettings.name')}</Label>
                  <Input />
                  {fieldState.error?.message ? (
                    <FieldError>{fieldState.error.message}</FieldError>
                  ) : (
                    <Description>{t('members.orgSettings.nameHint')}</Description>
                  )}
                </TextField>
              )}
            />

            <Controller
              control={form.control}
              name="slug"
              render={({ field, fieldState }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  isInvalid={!!fieldState.error}
                  isReadOnly={!canManage}
                  fullWidth
                >
                  <Label>{t('members.orgSettings.slug')}</Label>
                  <Input className="font-mono" />
                  {fieldState.error?.message ? (
                    <FieldError>{fieldState.error.message}</FieldError>
                  ) : (
                    <Description>{t('members.orgSettings.slugHint')}</Description>
                  )}
                </TextField>
              )}
            />
          </div>

          {canManage && (
            <Card.Footer className="flex justify-end border-t border-separator-border p-0 pt-3">
              <Button type="submit" size="sm" isDisabled={isSaving || !form.formState.isDirty}>
                {t('common.save')}
              </Button>
            </Card.Footer>
          )}
        </form>
      </Card.Content>
    </Card>
  );
}
