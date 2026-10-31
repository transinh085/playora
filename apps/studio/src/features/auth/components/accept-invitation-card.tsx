'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { toast } from '@playora/ui/components/base/toast/toast';
import { AlertCircle } from '@playora/ui/icons';
import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { authClient, isOrgRole, isRedeemerOnly } from '@/lib/auth-client';
import { useInvalidateMyOrgs, useInvitation } from '../api';

export function AcceptInvitationCard() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const router = useRouter();
  const invalidateMyOrgs = useInvalidateMyOrgs();
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
      toast.success(
        t('auth.inviteAccepted', { organization: invitationQuery.data.organizationName }),
      );
      const target = isRedeemerOnly(invitationQuery.data.role)
        ? `/orgs/${invitationQuery.data.organizationId}/redeem`
        : `/orgs/${invitationQuery.data.organizationId}`;
      router.replace(target as Route);
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
    window.location.assign(nextUrl);
  }

  const invitation = invitationQuery.data;
  const roleKey = invitation?.role && isOrgRole(invitation.role) ? invitation.role : 'viewer';

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
        <div className="border-b border-separator-border px-6 py-4">
          <h2 className="m-0 text-headline-semibold text-text-primary">{t('auth.inviteTitle')}</h2>
          {invitation && (
            <p className="mt-1 m-0 text-body-2-regular text-text-secondary">
              {t('auth.inviteDescription', {
                inviter: invitation.inviterEmail,
                organization: invitation.organizationName,
                role: t(`members.roles.${roleKey}`),
              })}
            </p>
          )}
        </div>
        <div className="space-y-4 p-6">
          {(sessionPending || invitationQuery.isPending) && (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {invitationQuery.isError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-2xl border border-border-button-default bg-notification-error-background p-4 text-text-error-primary"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span className="text-body-2-medium">{t('auth.inviteError')}</span>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-2xl border border-border-button-default bg-notification-error-background p-4 text-text-error-primary"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span className="text-body-2-medium">{actionError}</span>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {invitation && (
              <>
                <Button variant="secondary" size="small" disabled={submitting} onClick={onDecline}>
                  {t('auth.declineInvite')}
                </Button>
                <Button size="small" disabled={submitting} onClick={onAccept}>
                  {t('auth.acceptInvite')}
                </Button>
              </>
            )}
            {invitationQuery.isError && (
              <Button size="small" className="w-full" onClick={onSwitchAccount}>
                {t('auth.switchAccount')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
