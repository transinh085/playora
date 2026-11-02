'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Description,
  FieldError,
  Input,
  Label,
  Separator,
  TextField,
  toast,
} from '@playora/ui/components';
import {
  RiArrowLeftLine,
  RiGoogleFill,
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
    <Card className="grid w-full max-w-[1020px] overflow-hidden p-0 md:grid-cols-12">
      {/* Left Column: Authentication Form */}
      <div className="flex flex-col justify-between p-6 sm:p-10 md:col-span-6 lg:col-span-5">
        <div>
          {/* Brand Header */}
          <div className="mb-7 flex items-center justify-between">
            <Logo className="text-text-primary" />
          </div>

          {/* Contextual Invitation Banner */}
          {isInviteFlow && (
            <Alert status="accent" className="mb-5">
              <Alert.Indicator>
                <RiMailOpenLine className="size-4" />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Description>{t('inviteContextBanner')}</Alert.Description>
              </Alert.Content>
            </Alert>
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
                  isDisabled={isSendingLink}
                  onPress={onSendMagicLink}
                >
                  <RiMailSendLine className="size-4" />
                  {t('magicLinkResend')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onPress={() => setMagicLinkSentTo(null)}
                >
                  <RiArrowLeftLine className="size-4" />
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
                      <TextField
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        isInvalid={!!fieldState.error}
                        fullWidth
                      >
                        <Label className="inline-flex items-center gap-1.5">
                          <RiUser3Line className="size-3.5 text-text-tertiary" />
                          {t('name')}
                        </Label>
                        <Input placeholder={t('namePlaceholder')} autoComplete="name" />
                        {fieldState.error?.message && (
                          <FieldError>{fieldState.error.message}</FieldError>
                        )}
                      </TextField>
                    )}
                  />
                )}
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
                      <Label className="inline-flex items-center gap-1.5">
                        <RiMailLine className="size-3.5 text-text-tertiary" />
                        {t('email')}
                      </Label>
                      <Input placeholder={t('emailPlaceholder')} autoComplete="email" />
                      {fieldState.error?.message && (
                        <FieldError>{fieldState.error.message}</FieldError>
                      )}
                    </TextField>
                  )}
                />
                <Controller
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <TextField
                      type="password"
                      value={field.value}
                      onChange={field.onChange}
                      isInvalid={!!fieldState.error}
                      fullWidth
                    >
                      <Label className="inline-flex items-center gap-1.5">
                        <RiLockPasswordLine className="size-3.5 text-text-tertiary" />
                        {t('password')}
                      </Label>
                      <Input
                        placeholder={t('passwordPlaceholder')}
                        autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                      />
                      {fieldState.error?.message ? (
                        <FieldError>{fieldState.error.message}</FieldError>
                      ) : mode === 'sign-up' ? (
                        <Description>{t('passwordHint')}</Description>
                      ) : null}
                    </TextField>
                  )}
                />

                {error && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>{error}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                )}

                <div className="flex flex-col gap-2.5 pt-1">
                  <Button
                    type="submit"
                    className="w-full"
                    isDisabled={isSubmitting || isSendingLink}
                  >
                    {mode === 'sign-in' ? t('signIn') : t('signUp')}
                  </Button>

                  <div className="my-1.5 flex items-center gap-3">
                    <Separator className="flex-1" />
                    <span className="text-caption-1-medium text-text-tertiary">
                      {t('orDivider')}
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    isDisabled={isSubmitting || isSendingLink}
                    onPress={onSendMagicLink}
                  >
                    <RiMailSendLine className="size-4" />
                    {t('sendMagicLink')}
                  </Button>

                  {googleEnabled && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      isDisabled={isSubmitting || isSendingLink}
                      onPress={onGoogleSignIn}
                    >
                      <RiGoogleFill className="size-4" />
                      {t('continueWithGoogle')}
                    </Button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer Mode Switcher */}
        <div className="mt-6 pt-4 text-center">
          <Separator className="mb-4" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onPress={handleSwitchMode}
          >
            {mode === 'sign-in' ? t('toSignUp') : t('toSignIn')}
          </Button>
        </div>
      </div>

      {/* Right Column: Interactive Playora Outcome & Game Showcase */}
      <div className="hidden border-l border-separator-border md:col-span-6 md:block lg:col-span-7">
        <AuthShowcase />
      </div>
    </Card>
  );
}
