'use client';

import { AlertDialog, Avatar, Button, Chip } from '@playora/ui/components';
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
        <div className="py-8 text-center text-body-2-regular text-text-secondary">
          {t('members.pendingEmpty')}
        </div>
      </TableCard>
    );
  }

  return (
    <TableCard>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-body-2-regular">
          <thead>
            <tr className="border-b border-separator-border text-caption-1-semibold text-text-secondary">
              <th className="px-4 py-3">{t('members.email')}</th>
              <th className="px-4 py-3">{t('members.role')}</th>
              <th className="px-4 py-3">{t('members.expiresAt')}</th>
              {canManage && <th className="px-4 py-3 text-right">{t('members.actionsColumn')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-separator-border">
            {invitations.map((inv) => {
              const invRole: OrgRole = inv.role && isOrgRole(inv.role) ? inv.role : 'viewer';

              return (
                <tr key={inv.id} className="hover:bg-background-secondary-default/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar size="sm" color="accent">
                        <Avatar.Fallback>{inv.email.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                      </Avatar>
                      <span className="text-body-medium text-text-primary">{inv.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Chip variant="soft" color="default" size="sm">
                      {t(`members.roles.${invRole}`)}
                    </Chip>
                  </td>
                  <td className="px-4 py-3">
                    <Caption>
                      {format.dateTime(new Date(inv.expiresAt), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Caption>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          isDisabled={busyId === inv.id}
                          onPress={() => onResendInvitation(inv.id, inv.email, invRole)}
                        >
                          {t('members.resend')}
                        </Button>
                        <AlertDialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-text-error-primary hover:bg-notification-error-background"
                            isDisabled={busyId === inv.id}
                          >
                            {t('members.cancelInvite')}
                          </Button>
                          <AlertDialog.Backdrop isDismissable>
                            <AlertDialog.Container size="sm">
                              <AlertDialog.Dialog>
                                <AlertDialog.CloseTrigger />
                                <AlertDialog.Header>
                                  <AlertDialog.Icon status="danger" />
                                  <AlertDialog.Heading>
                                    {t('members.cancelInviteConfirm')}
                                  </AlertDialog.Heading>
                                </AlertDialog.Header>
                                <AlertDialog.Body>
                                  <p className="text-body-2-regular text-text-secondary">
                                    {inv.email}
                                  </p>
                                </AlertDialog.Body>
                                <AlertDialog.Footer>
                                  <Button slot="close" variant="secondary" size="sm">
                                    {t('common.cancel')}
                                  </Button>
                                  <Button
                                    slot="close"
                                    variant="danger"
                                    size="sm"
                                    onPress={() => onCancelInvitation(inv.id, inv.email)}
                                  >
                                    {t('common.delete')}
                                  </Button>
                                </AlertDialog.Footer>
                              </AlertDialog.Dialog>
                            </AlertDialog.Container>
                          </AlertDialog.Backdrop>
                        </AlertDialog>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TableCard>
  );
}
