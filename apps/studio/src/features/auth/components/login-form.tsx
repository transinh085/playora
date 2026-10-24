'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@playora/ui/components/card';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import { Separator } from '@playora/ui/components/separator';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
  const next = useSearchParams().get('next');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const redirectPath = next?.startsWith('/') && !next.startsWith('//') ? next : '/';

  async function onSubmit(values: Values) {
    setError(null);
    setMagicLinkSentTo(null);
    const { error } =
      mode === 'sign-in'
        ? await authClient.signIn.email({ email: values.email, password: values.password })
        : await authClient.signUp.email({
            email: values.email,
            password: values.password,
            name: values.name || values.email.split('@')[0] || 'Playora',
          });
    if (error) {
      setError(error.message ?? null);
      return;
    }
    // Only same-site relative paths are allowed as redirect targets.
    router.replace(redirectPath as Route);
    router.refresh();
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
      const { error } = await authClient.signIn.magicLink({ email, name, callbackURL });
      if (error) {
        setError(error.message ?? null);
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
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL });
    if (error) setError(error.message ?? null);
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">
          {mode === 'sign-in' ? t('signInTitle') : t('signUpTitle')}
        </CardTitle>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="grid gap-4">
          {mode === 'sign-up' && (
            <div className="grid gap-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" autoComplete="name" {...form.register('name')} />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...form.register('email')}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {magicLinkSentTo && (
            <p className="text-muted-foreground text-sm">
              {t('magicLinkSent', { email: magicLinkSentTo })}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting || isSendingLink}>
            {mode === 'sign-in' ? t('signIn') : t('signUp')}
          </Button>
          <div className="flex w-full items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs">{t('orDivider')}</span>
            <Separator className="flex-1" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isSubmitting || isSendingLink}
            onClick={onSendMagicLink}
          >
            {t('sendMagicLink')}
          </Button>
          {googleEnabled && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isSubmitting || isSendingLink}
              onClick={onGoogleSignIn}
            >
              {t('continueWithGoogle')}
            </Button>
          )}
          <Button
            type="button"
            variant="link"
            onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          >
            {mode === 'sign-in' ? t('toSignUp') : t('toSignIn')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
