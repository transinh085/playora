'use client';

import { App, Button, Popconfirm, Skeleton } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { assignableRolesFor, can, isOwnerRole, type OrgRole } from '@/lib/permissions';
import { useInvalidateOrgMembers, useOrgMembers } from '../api';
import { InviteMemberDialog } from './invite-member-dialog';
import { MembersTable } from './members-table';
import { PendingInvitationsTable } from './pending-invitations-table';

export function MembersView({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { message } = App.useApp();
  const { invalidateMembers, invalidateMyOrgs } = useInvalidateOrgMembers(orgId);
  const { data: session } = authClient.useSession();
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useOrgMembers(orgId);

  if (query.isPending) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Skeleton active paragraph={{ rows: 6 }} className="py-4" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-3 text-sm">
        <span className="text-[var(--ant-color-error)]">{t('common.unknownError')}</span>
        <Button size="small" onClick={() => query.refetch()}>
          {t('common.retry')}
        </Button>
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
        message.error(error.message ?? t('common.unknownError'));
        return;
      }
      await Promise.all([invalidateMembers(), invalidateMyOrgs()]);
      message.success(t('members.roleUpdated'));
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
        message.error(error.message ?? t('common.unknownError'));
        return;
      }
      await invalidateMembers();
      message.success(t('members.removed'));
    } finally {
      setBusyId(null);
    }
  }

  async function onLeaveOrg() {
    setBusyId('leave');
    try {
      const { error } = await authClient.organization.leave({ organizationId: orgId });
      if (error) {
        message.error(error.message ?? t('common.unknownError'));
        return;
      }
      await invalidateMyOrgs();
      message.success(t('members.left'));
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
        message.error(error.message ?? t('common.unknownError'));
        return;
      }
      await invalidateMembers();
      message.success(t('members.resent', { email }));
    } finally {
      setBusyId(null);
    }
  }

  async function onCancelInvitation(invId: string, email: string) {
    setBusyId(invId);
    try {
      const { error } = await authClient.organization.cancelInvitation({ invitationId: invId });
      if (error) {
        message.error(error.message ?? t('common.unknownError'));
        return;
      }
      await invalidateMembers();
      message.success(t('members.cancelled', { email }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('members.title')}</h1>
          <p className="text-sm text-[var(--ant-color-text-secondary)]">
            {t('members.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canLeave && (
            <Popconfirm
              title={t('members.leaveConfirm')}
              okText={t('members.leave')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
              onConfirm={onLeaveOrg}
              disabled={busyId === 'leave'}
            >
              <Button disabled={busyId === 'leave'}>{t('members.leave')}</Button>
            </Popconfirm>
          )}
          {canManage && <InviteMemberDialog orgId={orgId} assignableRoles={assignableRoles} />}
        </div>
      </div>

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
