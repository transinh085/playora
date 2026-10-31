'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@playora/ui/components/base/buttons/button';
import { Divider } from '@playora/ui/components/base/divider/divider';
import { Input } from '@playora/ui/components/base/input/input';
import { toast } from '@playora/ui/components/base/toast/toast';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';

const schema = z.object({
  name: z.string().optional(),
  email: z.email(),
  password: z.string().min(8),
});
type Values = z.infer<typeof schema>;

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', name: '' },
  });

  const redirectPath = next?.startsWith('/') && !next.startsWith('//') ? next : '/';

  async function onSubmit(rawValues: Values) {
    setError(null);
    setMagicLinkSentTo(null);
    setIsSubmitting(true);
    try {
      const values = schema.parse(rawValues);
      const { error: authError } =
        mode === 'sign-in'
          ? await authClient.signIn.email({ email: values.email, password: values.password })
          : await authClient.signUp.email({
              email: values.email,
              password: values.password,
              name: values.name || values.email.split('@')[0] || 'Playora',
            });
      if (authError) {
        setError(authError.message ?? null);
        return;
      }
      // Only same-site relative paths are allowed as redirect targets.
      router.replace(redirectPath as Route);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSendMagicLink() {
    setError(null);
    setMagicLinkSentTo(null);
    const valid = await form.trigger('email');
    if (!valid) return;

    const email = form.getValues('email');
    const name = form.getValues('name') || email.split('@')[0] || 'Playora';
    setIsSendingLink(true);
    try {
      const callbackURL = new URL(redirectPath, window.location.origin).toString();
      const { error: authError } = await authClient.signIn.magicLink({ email, name, callbackURL });
      if (authError) {
        setError(authError.message ?? null);
        return;
      }
      setMagicLinkSentTo(email);
      toast.success(t('magicLinkSent', { email }));
    } finally {
      setIsSendingLink(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    const callbackURL = new URL(redirectPath, window.location.origin).toString();
    const { error: authError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL,
    });
    if (authError) setError(authError.message ?? null);
  }

  return (
    <div className="w-full max-w-sm rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-card">
      <div className="pb-4 text-center">
        <h2 className="m-0 text-headline-semibold text-text-primary">
          {mode === 'sign-in' ? t('signInTitle') : t('signUpTitle')}
        </h2>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {mode === 'sign-up' && (
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Input
                label={t('name')}
                autoComplete="name"
                value={field.value ?? ''}
                onChange={field.onChange}
                isInvalid={!!fieldState.error}
                hint={fieldState.error?.message}
              />
            )}
          />
        )}
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Input
              label={t('email')}
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
          name="password"
          render={({ field, fieldState }) => (
            <Input
              label={t('password')}
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={field.value}
              onChange={field.onChange}
              isInvalid={!!fieldState.error}
              hint={fieldState.error?.message}
            />
          )}
        />

        {error && (
          <div className="rounded-xl bg-notification-error-background p-3 text-caption-1-medium text-text-error-primary">
            {error}
          </div>
        )}
        {magicLinkSentTo && (
          <div className="rounded-xl bg-notification-success-background p-3 text-caption-1-medium text-notification-success-foreground">
            {t('magicLinkSent', { email: magicLinkSentTo })}
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-2">
          <Button type="submit" className="w-full" disabled={isSubmitting || isSendingLink}>
            {mode === 'sign-in' ? t('signIn') : t('signUp')}
          </Button>

          <Divider className="my-1" contentClassName="text-caption-1-semibold uppercase">
            {t('orDivider')}
          </Divider>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={isSubmitting || isSendingLink}
            onClick={onSendMagicLink}
          >
            {t('sendMagicLink')}
          </Button>

          {googleEnabled && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={isSubmitting || isSendingLink}
              onClick={onGoogleSignIn}
            >
              {t('continueWithGoogle')}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="small"
            className="w-full"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              form.reset();
              setError(null);
              setMagicLinkSentTo(null);
            }}
          >
            {mode === 'sign-in' ? t('toSignUp') : t('toSignIn')}
          </Button>
        </div>
      </form>
    </div>
  );
}
