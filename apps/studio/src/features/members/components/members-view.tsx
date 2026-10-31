'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@playora/ui/components/alert-dialog';
import { Button } from '@playora/ui/components/button';
import { Skeleton } from '@playora/ui/components/skeleton';
import { toast } from '@playora/ui/components/sonner';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { authClient } from '@/lib/auth-client';
import { assignableRolesFor, can, isOwnerRole, type OrgRole } from '@/lib/permissions';
import { useInvalidateOrgMembers, useOrgMembers } from '../api';
import { InviteMemberDialog } from './invite-member-dialog';
import { MembersTable } from './members-table';
import { PendingInvitationsTable } from './pending-invitations-table';

export function MembersView({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { invalidateMembers, invalidateMyOrgs } = useInvalidateOrgMembers(orgId);
  const { data: session } = authClient.useSession();
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useOrgMembers(orgId);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-5 py-4 space-y-3">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div>
        <QueryError onRetry={() => query.refetch()} />
      </div>
    );
  }

  const org = query.data;
  const currentUserId = session?.user.id;
  const currentMember = org.members.find((m) => m.userId === currentUserId);
  const myRole = currentMember?.role ?? 'viewer';
  const canManage = can(myRole, { member: ['create'] });
  const actorIsOwner = isOwnerRole(myRole);
  const ownerCount = org.members.filter((m) => isOwnerRole(m.role)).length;
  const assignableRoles = assignableRolesFor(myRole);
  const canLeave = Boolean(currentMember && !(actorIsOwner && ownerCount <= 1));
  const pendingInvitations = org.invitations.filter((inv) => inv.status === 'pending');

  async function onRoleChange(memberId: string, role: OrgRole) {
    setBusyId(memberId);
    try {
      const { error } = await authClient.organization.updateMemberRole({
        organizationId: orgId,
        memberId,
        role: role as never,
      });
      if (error) {
        toast.error(error.message ?? t('common.unknownError'));
        return;
      }
      await Promise.all([invalidateMembers(), invalidateMyOrgs()]);
      toast.success(t('members.roleUpdated'));
    } finally {
      setBusyId(null);
    }
  }

  async function onRemoveMember(memberId: string) {
    setBusyId(memberId);
    try {
      const { error } = await authClient.organization.removeMember({
        organizationId: orgId,
        memberIdOrEmail: memberId,
      });
      if (error) {
        toast.error(error.message ?? t('common.unknownError'));
        return;
      }
      await invalidateMembers();
      toast.success(t('members.removed'));
    } finally {
      setBusyId(null);
    }
  }

  async function onLeaveOrg() {
    setBusyId('leave');
    try {
      const { error } = await authClient.organization.leave({ organizationId: orgId });
      if (error) {
        toast.error(error.message ?? t('common.unknownError'));
        return;
      }
      await invalidateMyOrgs();
      toast.success(t('members.left'));
      router.replace('/');
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function onResendInvitation(invId: string, email: string, role: string) {
    setBusyId(invId);
    try {
      const { error } = await authClient.organization.inviteMember({
        organizationId: orgId,
        email,
        role: role as never,
        resend: true,
      });
      if (error) {
        toast.error(error.message ?? t('common.unknownError'));
        return;
      }
      await invalidateMembers();
      toast.success(t('members.resent', { email }));
    } finally {
      setBusyId(null);
    }
  }

  async function onCancelInvitation(invId: string, email: string) {
    setBusyId(invId);
    try {
      const { error } = await authClient.organization.cancelInvitation({ invitationId: invId });
      if (error) {
        toast.error(error.message ?? t('common.unknownError'));
        return;
      }
      await invalidateMembers();
      toast.success(t('members.cancelled', { email }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('members.title')}
        description={t('members.description')}
        extra={
          <>
            {canLeave && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-full" disabled={busyId === 'leave'}>
                    {t('members.leave')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base font-bold">
                      {t('members.leaveConfirm')}
                    </AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full">
                      {t('common.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90 rounded-full"
                      onClick={onLeaveOrg}
                    >
                      {t('members.leave')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {canManage && <InviteMemberDialog orgId={orgId} assignableRoles={assignableRoles} />}
          </>
        }
      />

      <MembersTable
        members={org.members}
        currentUserId={currentUserId}
        canManage={canManage}
        actorIsOwner={actorIsOwner}
        ownerCount={ownerCount}
        assignableRoles={assignableRoles}
        busyId={busyId}
        onRoleChange={onRoleChange}
        onRemoveMember={onRemoveMember}
      />

      {(canManage || pendingInvitations.length > 0) && (
        <PendingInvitationsTable
          invitations={pendingInvitations}
          canManage={canManage}
          busyId={busyId}
          onResendInvitation={onResendInvitation}
          onCancelInvitation={onCancelInvitation}
        />
      )}
    </div>
  );
}
