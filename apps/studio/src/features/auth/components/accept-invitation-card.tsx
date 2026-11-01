'use client';

import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  Separator,
  Skeleton,
  toast,
} from '@playora/ui/components';
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
      <Card className="w-full max-w-[460px] overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card">
        {/* Top Brand & Title Header */}
        <Card.Header className="border-b border-separator-border px-6 pt-6 pb-5 sm:px-8">
          <div className="mb-5 flex w-full items-center justify-between">
            <Logo className="text-text-primary" />
            {session?.user.email && (
              <span className="max-w-[200px] truncate rounded-full bg-background-tertiary-default px-2.5 py-1 text-caption-2-medium text-text-secondary">
                {session.user.email}
              </span>
            )}
          </div>
          <Card.Title className="m-0 text-title-3-semibold text-text-primary">
            {t('auth.inviteTitle')}
          </Card.Title>
          {invitation && (
            <Card.Description className="mt-1.5 m-0 text-body-regular text-text-secondary">
              {t('auth.inviteDescription', {
                inviter: invitation.inviterEmail,
                organization: invitation.organizationName,
                role: t(`members.roles.${roleKey}`),
              })}
            </Card.Description>
          )}
        </Card.Header>

        {/* Body */}
        <Card.Content className="space-y-4 p-6 sm:p-8">
          {(sessionPending || invitationQuery.isPending) && (
            <div className="space-y-3 py-2">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          )}

          {invitation && (
            <Card
              variant="secondary"
              className="flex flex-col gap-3 border border-border-button-default p-4"
            >
              {/* Organization & Role Badge Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="md" color="accent">
                    <Avatar.Fallback>
                      {invitation.organizationName.slice(0, 1).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar>
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
                <Chip
                  variant="soft"
                  size="sm"
                  color={redeemerRole ? 'success' : 'accent'}
                  className="gap-1"
                >
                  {redeemerRole ? (
                    <RiTicket2Line className="size-3.5" aria-hidden />
                  ) : (
                    <RiShieldUserLine className="size-3.5" aria-hidden />
                  )}
                  <span>{t(`members.roles.${roleKey}`)}</span>
                </Chip>
              </div>

              <Separator />

              {/* Natural-language role explanation */}
              <div className="text-caption-1-regular text-text-secondary">
                {t(`auth.inviteRoleDescriptions.${roleKey}`)}
              </div>
            </Card>
          )}

          {invitationQuery.isError && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{t('auth.inviteError')}</Alert.Title>
              </Alert.Content>
            </Alert>
          )}

          {actionError && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{actionError}</Alert.Title>
              </Alert.Content>
            </Alert>
          )}

          {/* Actions */}
          <Card.Footer className="mt-2 flex flex-col gap-2.5 p-0 pt-2 sm:flex-row sm:justify-end">
            {invitation && (
              <>
                <Button variant="secondary" isDisabled={submitting} onPress={onDecline}>
                  <RiCloseLine className="size-4" />
                  {t('auth.declineInvite')}
                </Button>
                <Button isDisabled={submitting} onPress={onAccept}>
                  <RiCheckLine className="size-4" />
                  {t('auth.acceptInvite')}
                </Button>
              </>
            )}
            {invitationQuery.isError && (
              <Button className="w-full" onPress={onSwitchAccount}>
                <RiSwitchLine className="size-4" />
                {t('auth.switchAccount')}
              </Button>
            )}
          </Card.Footer>
        </Card.Content>
      </Card>
    </main>
  );
}
