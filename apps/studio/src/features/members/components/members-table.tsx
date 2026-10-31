'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@playora/ui/components/alert-dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { TableCard } from '@/components/table-card';
import { isOwnerRole, type OrgRole, parseMemberRoles } from '@/lib/permissions';

export interface MemberItem {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

interface MembersTableProps {
  members: MemberItem[];
  currentUserId?: string;
  canManage: boolean;
  actorIsOwner: boolean;
  ownerCount: number;
  assignableRoles: readonly OrgRole[];
  busyId: string | null;
  onRoleChange: (memberId: string, role: OrgRole) => void;
  onRemoveMember: (memberId: string) => void;
}

export function MembersTable({
  members,
  currentUserId,
  canManage,
  actorIsOwner,
  ownerCount,
  assignableRoles,
  busyId,
  onRoleChange,
  onRemoveMember,
}: MembersTableProps) {
  const t = useTranslations();

  return (
    <TableCard>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">{t('members.memberColumn')}</TableHead>
              <TableHead>{t('members.role')}</TableHead>
              {canManage && (
                <TableHead className="text-right">{t('members.actionsColumn')}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const primaryRole: OrgRole = parseMemberRoles(member.role)[0] ?? 'viewer';
              const targetIsOwner = isOwnerRole(member.role);
              const canEditRole =
                canManage && (!targetIsOwner || (actorIsOwner && (!isSelf || ownerCount > 1)));
              const canRemove =
                canManage && !isSelf && (!targetIsOwner || (actorIsOwner && ownerCount > 1));

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 rounded-full border border-border/80 bg-primary/10 text-primary font-bold text-xs">
                        <AvatarFallback>
                          {(member.user.name || member.user.email).slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {member.user.name}
                          </span>
                          {isSelf && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 font-normal"
                            >
                              {t('members.you')}
                            </Badge>
                          )}
                        </div>
                        <Caption>{member.user.email}</Caption>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {!canEditRole ? (
                      <Badge variant="outline" className="text-xs font-normal">
                        {t(`members.roles.${primaryRole}`)}
                      </Badge>
                    ) : (
                      <Select
                        value={primaryRole}
                        disabled={busyId === member.id}
                        onValueChange={(val) => onRoleChange(member.id, val as OrgRole)}
                      >
                        <SelectTrigger
                          className="w-36 rounded-md text-xs h-8"
                          aria-label={`${t('members.role')} ${member.user.email}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {assignableRoles.map((role) => (
                            <SelectItem key={role} value={role} className="text-xs">
                              {t(`members.roles.${role}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>

                  {canManage && (
                    <TableCell className="text-right">
                      {canRemove && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2 text-xs rounded-md"
                              disabled={busyId === member.id}
                            >
                              {t('members.remove')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-[#0A0A0A]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-sm font-semibold">
                                {t('members.removeConfirm')}
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
                                {member.user.name} ({member.user.email})
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-2">
                              <AlertDialogCancel className="h-8 rounded-md text-xs">
                                {t('common.cancel')}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="h-8 rounded-md bg-destructive text-xs text-white hover:bg-destructive/90"
                                onClick={() => onRemoveMember(member.id)}
                              >
                                {t('common.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TableCard>
  );
}
