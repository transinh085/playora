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
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
import { useFormatter, useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { TableCard } from '@/components/table-card';
import { isOrgRole, type OrgRole } from '@/lib/permissions';

export interface InvitationItem {
  id: string;
  email: string;
  role?: string | null;
  status: string;
  expiresAt: string | Date;
}

interface PendingInvitationsTableProps {
  invitations: InvitationItem[];
  canManage: boolean;
  busyId: string | null;
  onResendInvitation: (invId: string, email: string, role: string) => void;
  onCancelInvitation: (invId: string, email: string) => void;
}

export function PendingInvitationsTable({
  invitations,
  canManage,
  busyId,
  onResendInvitation,
  onCancelInvitation,
}: PendingInvitationsTableProps) {
  const t = useTranslations();
  const format = useFormatter();

  if (invitations.length === 0) {
    return (
      <TableCard>
        <div className="py-8 text-center text-xs text-muted-foreground">
          {t('members.pendingEmpty')}
        </div>
      </TableCard>
    );
  }

  return (
    <TableCard>
      <div className="overflow-x-auto">
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
            {invitations.map((inv) => {
              const invRole: OrgRole = inv.role && isOrgRole(inv.role) ? inv.role : 'viewer';

              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-semibold text-sm">{inv.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {t(`members.roles.${invRole}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Caption>
                      {format.dateTime(new Date(inv.expiresAt), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Caption>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-md text-xs"
                          disabled={busyId === inv.id}
                          onClick={() => onResendInvitation(inv.id, inv.email, invRole)}
                        >
                          {t('members.resend')}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2 text-xs rounded-md"
                              disabled={busyId === inv.id}
                            >
                              {t('members.cancelInvite')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-[#0A0A0A]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-sm font-semibold">
                                {t('members.cancelInviteConfirm')}
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
                                {inv.email}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-2">
                              <AlertDialogCancel className="h-8 rounded-md text-xs">
                                {t('common.cancel')}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="h-8 rounded-md bg-destructive text-xs text-white hover:bg-destructive/90"
                                onClick={() => onCancelInvitation(inv.id, inv.email)}
                              >
                                {t('common.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
