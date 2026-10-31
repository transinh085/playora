'use client';

import { Alert, AlertTitle } from '@playora/ui/components/alert';
import { Button } from '@playora/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@playora/ui/components/card';
import { Skeleton } from '@playora/ui/components/skeleton';
import { toast } from '@playora/ui/components/sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
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
      <Card className="w-full max-w-md rounded-2xl border-border/80 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{t('auth.inviteTitle')}</CardTitle>
          {invitation && (
            <CardDescription className="text-xs text-muted-foreground">
              {t('auth.inviteDescription', {
                inviter: invitation.inviterEmail,
                organization: invitation.organizationName,
                role: t(`members.roles.${roleKey}`),
              })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {(sessionPending || invitationQuery.isPending) && (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {invitationQuery.isError && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs">{t('auth.inviteError')}</AlertTitle>
            </Alert>
          )}

          {actionError && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="size-4" />
              <AlertTitle className="text-xs">{actionError}</AlertTitle>
            </Alert>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {invitation && (
              <>
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={submitting}
                  onClick={onDecline}
                >
                  {t('auth.declineInvite')}
                </Button>
                <Button className="rounded-full shadow-xs" disabled={submitting} onClick={onAccept}>
                  {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t('auth.acceptInvite')}
                </Button>
              </>
            )}
            {invitationQuery.isError && (
              <Button className="w-full rounded-full" onClick={onSwitchAccount}>
                {t('auth.switchAccount')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
