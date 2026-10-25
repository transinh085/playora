'use client';

import { Alert, App, Button, Card, Skeleton, Typography } from 'antd';
import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { authClient, isOrgRole } from '@/lib/auth-client';
import { useInvalidateMyOrgs, useInvitation } from '../api';

export function AcceptInvitationCard() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const router = useRouter();
  const invalidateMyOrgs = useInvalidateMyOrgs();
  const { message } = App.useApp();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const nextUrl = `/login?next=${encodeURIComponent(`/invite/${id}`)}` as Route;

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace(nextUrl);
    }
  }, [sessionPending, session, router, nextUrl]);

  const invitationQuery = useInvitation(id, session?.user.id);

  async function onAccept() {
    if (!invitationQuery.data) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const { error } = await authClient.organization.acceptInvitation({ invitationId: id });
      if (error) {
        setActionError(error.message ?? t('common.unknownError'));
        return;
      }
      await invalidateMyOrgs();
      message.success(
        t('auth.inviteAccepted', { organization: invitationQuery.data.organizationName }),
      );
      router.replace(`/orgs/${invitationQuery.data.organizationId}/events` as Route);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function onDecline() {
    setSubmitting(true);
    setActionError(null);
    try {
      const { error } = await authClient.organization.rejectInvitation({ invitationId: id });
      if (error) {
        setActionError(error.message ?? t('common.unknownError'));
        return;
      }
      router.replace('/');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function onSwitchAccount() {
    await authClient.signOut();
    // Full navigation: a soft replace + refresh can re-render /login after the user already
    // switched it to sign-up, resetting the form.
    window.location.assign(nextUrl);
  }

  const invitation = invitationQuery.data;
  const roleKey = invitation?.role && isOrgRole(invitation.role) ? invitation.role : 'viewer';

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md" title={t('auth.inviteTitle')}>
        {invitation && (
          <Typography.Paragraph type="secondary">
            {t('auth.inviteDescription', {
              inviter: invitation.inviterEmail,
              organization: invitation.organizationName,
              role: t(`members.roles.${roleKey}`),
            })}
          </Typography.Paragraph>
        )}

        {(sessionPending || invitationQuery.isPending) && (
          <div className="py-2">
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        )}

        {invitationQuery.isError && (
          <Alert type="error" showIcon title={t('auth.inviteError')} className="mb-3" />
        )}

        {actionError && <Alert type="error" showIcon title={actionError} className="mb-3" />}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {invitation && (
            <>
              <Button disabled={submitting} onClick={onDecline}>
                {t('auth.declineInvite')}
              </Button>
              <Button type="primary" loading={submitting} onClick={onAccept}>
                {t('auth.acceptInvite')}
              </Button>
            </>
          )}
          {invitationQuery.isError && (
            <Button className="w-full" onClick={onSwitchAccount}>
              {t('auth.switchAccount')}
            </Button>
          )}
        </div>
      </Card>
    </main>
  );
}
