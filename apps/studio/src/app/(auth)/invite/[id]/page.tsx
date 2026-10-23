'use client';

import { routePrefix } from '@playora/api-client/react';
import { meApi } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@playora/ui/components/card';
import { Skeleton } from '@playora/ui/components/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authClient, isOrgRole } from '@/lib/auth-client';

export default function AcceptInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const nextUrl = `/login?next=${encodeURIComponent(`/invite/${id}`)}` as Route;

  useEffect(() => {
    if (!sessionPending && !session) {
      router.replace(nextUrl);
    }
  }, [sessionPending, session, router, nextUrl]);

  const invitationQuery = useQuery({
    queryKey: ['auth', 'invitation', id, session?.user.id],
    enabled: Boolean(session?.user.id && id),
    retry: false,
    queryFn: async () => {
      const { data, error } = await authClient.organization.getInvitation({ query: { id } });
      if (error || !data) {
        throw new Error(error?.message ?? 'Invitation not found');
      }
      return data;
    },
  });

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
      await queryClient.invalidateQueries({ queryKey: routePrefix(meApi.orgs) });
      toast.success(
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
    router.replace(nextUrl);
    router.refresh();
  }

  const invitation = invitationQuery.data;
  const roleKey = invitation?.role && isOrgRole(invitation.role) ? invitation.role : 'viewer';

  return (
    <main className="bg-muted/40 flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{t('auth.inviteTitle')}</CardTitle>
          {invitation && (
            <CardDescription>
              {t('auth.inviteDescription', {
                inviter: invitation.inviterEmail,
                organization: invitation.organizationName,
                role: t(`members.roles.${roleKey}`),
              })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid gap-4">
          {(sessionPending || invitationQuery.isPending) && (
            <div className="grid gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          )}
          {invitationQuery.isError && (
            <p className="text-destructive text-sm">{t('auth.inviteError')}</p>
          )}
          {actionError && <p className="text-destructive text-sm">{actionError}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {invitation && (
            <>
              <Button type="button" variant="outline" disabled={submitting} onClick={onDecline}>
                {t('auth.declineInvite')}
              </Button>
              <Button type="button" disabled={submitting} onClick={onAccept}>
                {t('auth.acceptInvite')}
              </Button>
            </>
          )}
          {invitationQuery.isError && (
            <Button type="button" variant="outline" className="w-full" onClick={onSwitchAccount}>
              {t('auth.switchAccount')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
