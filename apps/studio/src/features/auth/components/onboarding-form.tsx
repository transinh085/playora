'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Slug } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@playora/ui/components/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@playora/ui/components/form';
import { Input } from '@playora/ui/components/input';
import { toast } from '@playora/ui/components/sonner';
import { Loader2 } from '@playora/ui/icons';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
      <Card className="rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
        <CardHeader className="border-b border-neutral-200 px-6 py-4 dark:border-white/10">
          <CardTitle className="text-base font-semibold">{t('title')}</CardTitle>
          <CardDescription className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">{t('orgName')}</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        className="h-9 rounded-md text-xs"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const slug = slugify(e.target.value);
                          form.setValue('slug', slug, { shouldValidate: true });
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">{t('orgSlug')}</FormLabel>
                    <FormControl>
                      <Input id="slug" className="h-9 rounded-md text-xs font-mono" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button
                  type="submit"
                  className="h-9 rounded-md text-xs font-medium shadow-xs px-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  {t('submit')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
