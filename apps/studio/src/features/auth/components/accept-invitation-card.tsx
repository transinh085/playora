'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { toast } from '@playora/ui/components/base/toast/toast';
import { AlertCircle } from '@playora/ui/icons';
import {
  RiCheckLine,
  RiCloseLine,
  RiMailSendLine,
  RiShieldUserLine,
  RiSwitchLine,
  RiTicket2Line,
} from '@remixicon/react';
import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
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
  const redeemerRole = invitation ? isRedeemerOnly(invitation.role) : false;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-full p-4 sm:p-6">
      <div className="w-full max-w-[460px] overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
        {/* Top Brand & Title Header */}
        <div className="border-b border-separator-border px-6 pt-6 pb-5 sm:px-8">
          <div className="mb-5 flex items-center justify-between">
            <Logo className="text-text-primary" />
            {session?.user.email && (
              <span className="max-w-[200px] truncate rounded-full bg-background-tertiary-default px-2.5 py-1 text-caption-2-medium text-text-secondary">
                {session.user.email}
              </span>
            )}
          </div>
          <h2 className="m-0 text-title-3-semibold text-text-primary">{t('auth.inviteTitle')}</h2>
          {invitation && (
            <p className="mt-1.5 m-0 text-body-regular text-text-secondary">
              {t('auth.inviteDescription', {
                inviter: invitation.inviterEmail,
                organization: invitation.organizationName,
                role: t(`members.roles.${roleKey}`),
              })}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="space-y-4 p-6 sm:p-8">
          {(sessionPending || invitationQuery.isPending) && (
            <div className="space-y-3 py-2">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          )}

          {invitation && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-secondary-default p-4">
              {/* Organization & Role Badge Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-emerald-500 to-cyan-600 text-body-semibold font-bold text-white shadow-xs">
                    {invitation.organizationName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 truncate text-body-semibold text-text-primary">
                      {invitation.organizationName}
                    </p>
                    <p className="m-0 flex items-center gap-1 truncate text-caption-1-regular text-text-tertiary">
                      <RiMailSendLine className="size-3.5 shrink-0" />
                      <span className="truncate">{invitation.inviterEmail}</span>
                    </p>
                  </div>
                </div>
                <Chip variant="caption" color={redeemerRole ? 'lime' : 'cyan'} className="gap-1">
                  {redeemerRole ? (
                    <RiTicket2Line className="size-3.5" aria-hidden />
                  ) : (
                    <RiShieldUserLine className="size-3.5" aria-hidden />
                  )}
                  <span>{t(`members.roles.${roleKey}`)}</span>
                </Chip>
              </div>

              {/* Natural-language role explanation */}
              <div className="border-t border-separator-border pt-3 text-caption-1-regular text-text-secondary">
                {t(`auth.inviteRoleDescriptions.${roleKey}`)}
              </div>
            </div>
          )}

          {invitationQuery.isError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-border-button-default bg-notification-error-background p-4 text-text-error-primary"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span className="text-body-2-medium">{t('auth.inviteError')}</span>
            </div>
          )}

          {actionError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-border-button-default bg-notification-error-background p-4 text-text-error-primary"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span className="text-body-2-medium">{actionError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex flex-col gap-2.5 pt-2 sm:flex-row sm:justify-end">
            {invitation && (
              <>
                <Button
                  variant="secondary"
                  leadingIcon={RiCloseLine}
                  disabled={submitting}
                  onClick={onDecline}
                >
                  {t('auth.declineInvite')}
                </Button>
                <Button leadingIcon={RiCheckLine} disabled={submitting} onClick={onAccept}>
                  {t('auth.acceptInvite')}
                </Button>
              </>
            )}
            {invitationQuery.isError && (
              <Button className="w-full" leadingIcon={RiSwitchLine} onClick={onSwitchAccount}>
                {t('auth.switchAccount')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
