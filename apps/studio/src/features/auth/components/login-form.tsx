'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
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
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
    <Card className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]">
      <CardHeader className="text-center pb-2 pt-6">
        <CardTitle className="text-base font-semibold">
          {mode === 'sign-in' ? t('signInTitle') : t('signUpTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
            {mode === 'sign-up' && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">{t('name')}</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        autoComplete="name"
                        className="h-9 rounded-md text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">{t('email')}</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="h-9 rounded-md text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">{t('password')}</FormLabel>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                      className="h-9 rounded-md text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {error && (
              <div className="rounded-md bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
                {error}
              </div>
            )}
            {magicLinkSentTo && (
              <div className="rounded-md bg-teal-500/10 p-2.5 text-xs font-medium text-teal-800 dark:text-teal-200">
                {t('magicLinkSent', { email: magicLinkSentTo })}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2.5">
              <Button
                type="submit"
                className="w-full h-9 rounded-md text-xs font-medium shadow-xs"
                disabled={isSubmitting || isSendingLink}
              >
                {isSubmitting && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                {mode === 'sign-in' ? t('signIn') : t('signUp')}
              </Button>

              <div className="relative my-1 text-center text-xs text-neutral-400">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-neutral-200 dark:border-white/10" />
                </div>
                <span className="relative bg-white px-2 text-[10px] uppercase tracking-wider text-neutral-400 dark:bg-[#0A0A0A]">
                  {t('orDivider')}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-9 rounded-md text-xs font-medium shadow-xs"
                disabled={isSubmitting || isSendingLink}
                onClick={onSendMagicLink}
              >
                {isSendingLink && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                {t('sendMagicLink')}
              </Button>

              {googleEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-9 rounded-md text-xs font-medium shadow-xs"
                  disabled={isSubmitting || isSendingLink}
                  onClick={onGoogleSignIn}
                >
                  {t('continueWithGoogle')}
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                className="w-full h-8 rounded-md text-xs text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
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
        </Form>
      </CardContent>
    </Card>
  );
}
