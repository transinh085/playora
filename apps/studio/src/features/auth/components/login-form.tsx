'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@playora/ui/components/base/buttons/button';
import { Divider } from '@playora/ui/components/base/divider/divider';
import { Input } from '@playora/ui/components/base/input/input';
import { SocialButton } from '@playora/ui/components/base/social-button/social-button';
import { toast } from '@playora/ui/components/base/toast/toast';
import {
  RiArrowLeftLine,
  RiErrorWarningLine,
  RiLockPasswordLine,
  RiMailCheckLine,
  RiMailLine,
  RiMailOpenLine,
  RiMailSendLine,
  RiUser3Line,
} from '@remixicon/react';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Logo } from '@/components/logo';
import { authClient } from '@/lib/auth-client';
import { AuthShowcase } from './auth-showcase';

const schema = z.object({
  name: z.string().optional(),
  email: z.email(),
  password: z.string().min(8),
});
type Values = z.infer<typeof schema>;

export function LoginForm({
  googleEnabled,
  initialMode,
}: {
  googleEnabled: boolean;
  initialMode?: 'sign-in' | 'sign-up';
}) {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const queryMode = searchParams.get('mode');
  const resolvedInitialMode: 'sign-in' | 'sign-up' =
    initialMode ?? (queryMode === 'sign-up' || queryMode === 'register' ? 'sign-up' : 'sign-in');

  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(resolvedInitialMode);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', name: '' },
  });

  const redirectPath = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
  const isInviteFlow = Boolean(redirectPath.startsWith('/invite/'));

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

  function handleSwitchMode() {
    setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
    form.reset();
    setError(null);
    setMagicLinkSentTo(null);
  }

  return (
    <div className="grid w-full max-w-[1020px] overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card md:grid-cols-12">
      {/* Left Column: Authentication Form */}
      <div className="flex flex-col justify-between p-6 sm:p-10 md:col-span-6 lg:col-span-5">
        <div>
          {/* Brand Header */}
          <div className="mb-7 flex items-center justify-between">
            <Logo className="text-text-primary" />
          </div>

          {/* Contextual Invitation Banner */}
          {isInviteFlow && (
            <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-border-button-default bg-background-secondary-default p-3.5 text-caption-1-medium text-text-secondary">
              <RiMailOpenLine className="mt-0.5 size-4 shrink-0 text-accent-600" />
              <span>{t('inviteContextBanner')}</span>
            </div>
          )}

          {magicLinkSentTo ? (
            /* Dedicated Magic Link Confirmation View */
            <div className="flex flex-col gap-5 py-2">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-600">
                <RiMailCheckLine className="size-6" aria-hidden />
              </div>

              <div className="flex flex-col gap-1.5">
                <h1 className="m-0 text-title-2-semibold text-text-primary">
                  {t('magicLinkTitle')}
                </h1>
                <p className="m-0 text-body-regular text-text-secondary">
                  {t('magicLinkSent', { email: magicLinkSentTo })}
                </p>
                <p className="m-0 text-caption-1-regular text-text-tertiary">
                  {t('magicLinkHint')}
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  leadingIcon={RiMailSendLine}
                  disabled={isSendingLink}
                  onClick={onSendMagicLink}
                >
                  {t('magicLinkResend')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  className="w-full"
                  leadingIcon={RiArrowLeftLine}
                  onClick={() => setMagicLinkSentTo(null)}
                >
                  {t('magicLinkBack')}
                </Button>
              </div>
            </div>
          ) : (
            /* Standard Sign-In / Sign-Up Form */
            <>
              <div className="mb-6 flex flex-col gap-1.5">
                <h1 className="m-0 text-title-2-semibold text-text-primary">
                  {mode === 'sign-in' ? t('signInTitle') : t('signUpTitle')}
                </h1>
                <p className="m-0 text-body-regular text-text-secondary">
                  {mode === 'sign-in' ? t('signInSubtitle') : t('signUpSubtitle')}
                </p>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {mode === 'sign-up' && (
                  <Controller
                    control={form.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <Input
                        label={t('name')}
                        placeholder={t('namePlaceholder')}
                        leadingIcon={RiUser3Line}
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
                      placeholder={t('emailPlaceholder')}
                      leadingIcon={RiMailLine}
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
                      placeholder={t('passwordPlaceholder')}
                      leadingIcon={RiLockPasswordLine}
                      autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                      hint={
                        fieldState.error?.message ??
                        (mode === 'sign-up' ? t('passwordHint') : undefined)
                      }
                    />
                  )}
                />

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-2xl border border-border-button-default bg-notification-error-background p-3.5 text-caption-1-medium text-text-error-primary"
                  >
                    <RiErrorWarningLine className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2.5 pt-1">
                  <Button type="submit" className="w-full" disabled={isSubmitting || isSendingLink}>
                    {mode === 'sign-in' ? t('signIn') : t('signUp')}
                  </Button>

                  <Divider className="my-1.5" contentClassName="text-caption-1-medium">
                    {t('orDivider')}
                  </Divider>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    leadingIcon={RiMailSendLine}
                    disabled={isSubmitting || isSendingLink}
                    onClick={onSendMagicLink}
                  >
                    {t('sendMagicLink')}
                  </Button>

                  {googleEnabled && (
                    <SocialButton
                      brand="google"
                      appearance="white"
                      fullWidth
                      disabled={isSubmitting || isSendingLink}
                      onClick={onGoogleSignIn}
                    >
                      {t('continueWithGoogle')}
                    </SocialButton>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer Mode Switcher */}
        <div className="mt-6 border-t border-separator-border pt-4 text-center">
          <Button
            type="button"
            variant="ghost"
            size="small"
            className="w-full"
            onClick={handleSwitchMode}
          >
            {mode === 'sign-in' ? t('toSignUp') : t('toSignIn')}
          </Button>
        </div>
      </div>

      {/* Right Column: Interactive Playora Outcome & Game Showcase */}
      <div className="hidden border-l border-separator-border md:col-span-6 md:block lg:col-span-7">
        <AuthShowcase />
      </div>
    </div>
  );
}
