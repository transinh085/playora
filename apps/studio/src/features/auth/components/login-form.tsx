'use client';

import { useZodForm } from '@playora/ui/form';
import { App, Button, Card, Divider, Form, Input, Typography } from 'antd';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
  const { message } = App.useApp();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { form, rules, parse } = useZodForm(schema);

  const redirectPath = next?.startsWith('/') && !next.startsWith('//') ? next : '/';

  async function onSubmit(rawValues: Values) {
    setError(null);
    setMagicLinkSentTo(null);
    setIsSubmitting(true);
    try {
      const values = parse(rawValues);
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
    try {
      await form.validateFields(['email']);
    } catch {
      return;
    }
    const email = form.getFieldValue('email');
    const name =
      form.getFieldValue('name') ||
      (typeof email === 'string' ? email.split('@')[0] : '') ||
      'Playora';
    setIsSendingLink(true);
    try {
      const callbackURL = new URL(redirectPath, window.location.origin).toString();
      const { error: authError } = await authClient.signIn.magicLink({ email, name, callbackURL });
      if (authError) {
        setError(authError.message ?? null);
        return;
      }
      setMagicLinkSentTo(email);
      message.success(t('magicLinkSent', { email }));
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
    <Card
      className="w-full max-w-sm"
      title={
        <span className="text-xl font-semibold">
          {mode === 'sign-in' ? t('signInTitle') : t('signUpTitle')}
        </span>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ email: '', password: '' }}
        onFinish={onSubmit}
      >
        {mode === 'sign-up' && (
          <Form.Item name="name" label={t('name')} rules={rules}>
            <Input id="name" autoComplete="name" />
          </Form.Item>
        )}
        <Form.Item name="email" label={t('email')} rules={rules}>
          <Input id="email" type="email" autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" label={t('password')} rules={rules}>
          <Input.Password
            id="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          />
        </Form.Item>

        {error && (
          <div className="mb-4">
            <Typography.Text type="danger" className="text-sm">
              {error}
            </Typography.Text>
          </div>
        )}
        {magicLinkSentTo && (
          <div className="mb-4">
            <Typography.Text type="secondary" className="text-sm">
              {t('magicLinkSent', { email: magicLinkSentTo })}
            </Typography.Text>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={isSubmitting}
            disabled={isSendingLink}
          >
            {mode === 'sign-in' ? t('signIn') : t('signUp')}
          </Button>

          <Divider plain className="my-1 text-xs text-[var(--ant-color-text-secondary)]">
            {t('orDivider')}
          </Divider>

          <Button
            type="default"
            block
            disabled={isSubmitting || isSendingLink}
            loading={isSendingLink}
            onClick={onSendMagicLink}
          >
            {t('sendMagicLink')}
          </Button>

          {googleEnabled && (
            <Button
              type="default"
              block
              disabled={isSubmitting || isSendingLink}
              onClick={onGoogleSignIn}
            >
              {t('continueWithGoogle')}
            </Button>
          )}

          <Button
            type="link"
            block
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              form.resetFields();
              setError(null);
              setMagicLinkSentTo(null);
            }}
          >
            {mode === 'sign-in' ? t('toSignUp') : t('toSignIn')}
          </Button>
        </div>
      </Form>
    </Card>
  );
}
