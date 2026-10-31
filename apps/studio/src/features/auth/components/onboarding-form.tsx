'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Slug } from '@playora/contracts';
import { Button } from '@playora/ui/components/base/buttons/button';
import { Input } from '@playora/ui/components/base/input/input';
import { toast } from '@playora/ui/components/base/toast/toast';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '' },
  });

  async function onSubmit(rawValues: Values) {
    setIsSubmitting(true);
    try {
      const values = schema.parse(rawValues);
      const { data, error } = await authClient.organization.create(values);
      if (error || !data) {
        form.setError('slug', {
          message: error?.message ?? tCommon('unknownError'),
        });
        return;
      }
      toast.success(values.name);
      router.replace(`/orgs/${data.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col py-16">
      <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
        <div className="border-b border-separator-border px-6 py-4">
          <h2 className="m-0 text-headline-semibold text-text-primary">{t('title')}</h2>
          <p className="mt-1 m-0 text-body-2-regular text-text-secondary">{t('description')}</p>
        </div>
        <div className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Input
                  label={t('orgName')}
                  value={field.value}
                  onChange={(val) => {
                    field.onChange(val);
                    const slug = slugify(val);
                    form.setValue('slug', slug, { shouldValidate: true });
                  }}
                  isInvalid={!!fieldState.error}
                  hint={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="slug"
              render={({ field, fieldState }) => (
                <Input
                  label={t('orgSlug')}
                  value={field.value}
                  onChange={field.onChange}
                  isInvalid={!!fieldState.error}
                  hint={fieldState.error?.message}
                  inputClassName="font-mono"
                />
              )}
            />
            <div className="pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {t('submit')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
