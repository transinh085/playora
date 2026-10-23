'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Slug } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@playora/ui/components/card';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '' },
  });

  async function onSubmit(values: Values) {
    const { data, error } = await authClient.organization.create(values);
    if (error || !data) {
      form.setError('slug', { message: error?.message });
      return;
    }
    toast.success(values.name);
    router.replace(`/orgs/${data.id}/events`);
    router.refresh();
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <div className="mx-auto flex max-w-lg flex-col py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('orgName')}</Label>
              <Input
                id="name"
                aria-invalid={!!errors.name}
                {...form.register('name', {
                  onChange: (e) =>
                    form.setValue('slug', slugify(e.target.value), { shouldValidate: true }),
                })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">{t('orgSlug')}</Label>
              <Input id="slug" aria-invalid={!!errors.slug} {...form.register('slug')} />
              {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {t('submit')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
