'use client';

import { Avatar, AvatarFallback } from '@playora/ui/components/avatar';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { Skeleton } from '@playora/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  assignableRolesFor,
  authClient,
  canManageMembers,
  isOrgRole,
  isOwnerRole,
  type OrgRole,
  parseMemberRoles,
} from '@/lib/auth-client';
import { useInvalidateOrgMembers, useOrgMembers } from '../api';
import { InviteMemberDialog } from './invite-member-dialog';

export function MembersView({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const { invalidateMembers, invalidateMyOrgs } = useInvalidateOrgMembers(orgId);
  const { data: session } = authClient.useSession();
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useOrgMembers(orgId);

  if (query.isPending) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-3 text-sm">
        <span className="text-destructive">{t('common.unknownError')}</span>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const org = query.data;
  const currentUserId = session?.user.id;
  const currentMember = org.members.find((m) => m.userId === currentUserId);
  const myRole = currentMember?.role ?? 'viewer';
  const canManage = canManageMembers(myRole);
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
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('members.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('members.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          {canLeave && (
            <Button
              type="button"
              variant="outline"
              disabled={busyId === 'leave'}
              onClick={onLeaveOrg}
            >
              {t('members.leave')}
            </Button>
          )}
          {canManage && <InviteMemberDialog orgId={orgId} assignableRoles={assignableRoles} />}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('members.memberColumn')}</TableHead>
            <TableHead>{t('members.role')}</TableHead>
            {canManage && (
              <TableHead className="text-right">{t('members.actionsColumn')}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {org.members.map((member) => {
            const primaryRole: OrgRole = parseMemberRoles(member.role)[0] ?? 'viewer';
            const isSelf = member.userId === currentUserId;
            const targetIsOwner = isOwnerRole(member.role);
            const canEditRole =
              canManage && (!targetIsOwner || (actorIsOwner && (!isSelf || ownerCount > 1)));
            const canRemove =
              canManage && !isSelf && (!targetIsOwner || (actorIsOwner && ownerCount > 1));

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback>
                        {(member.user.name || member.user.email).slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <span>{member.user.name}</span>
                        {isSelf && <Badge variant="secondary">{t('members.you')}</Badge>}
                      </div>
                      <div className="text-muted-foreground text-xs">{member.user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canEditRole ? (
                    <Select
                      value={primaryRole}
                      disabled={busyId === member.id}
                      onValueChange={(value) => {
                        if (isOrgRole(value)) onRoleChange(member.id, value);
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-40"
                        aria-label={`${t('members.role')} ${member.user.email}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`members.roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{t(`members.roles.${primaryRole}`)}</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {canRemove && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyId === member.id}
                        onClick={() => onRemoveMember(member.id)}
                      >
                        {t('members.remove')}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {(canManage || pendingInvitations.length > 0) && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{t('members.pendingTitle')}</h2>
          {pendingInvitations.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              {t('members.pendingEmpty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('members.email')}</TableHead>
                  <TableHead>{t('members.role')}</TableHead>
                  <TableHead>{t('members.expiresAt')}</TableHead>
                  {canManage && (
                    <TableHead className="text-right">{t('members.actionsColumn')}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((inv) => {
                  const invRole: OrgRole = inv.role && isOrgRole(inv.role) ? inv.role : 'viewer';
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t(`members.roles.${invRole}`)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format.dateTime(new Date(inv.expiresAt), {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busyId === inv.id}
                              onClick={() => onResendInvitation(inv.id, inv.email, invRole)}
                            >
                              {t('members.resend')}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busyId === inv.id}
                              onClick={() => onCancelInvitation(inv.id, inv.email)}
                            >
                              {t('members.cancelInvite')}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </div>
  );
}
