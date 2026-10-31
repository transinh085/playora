'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { AlertDialog, ModalTrigger } from '@playora/ui/components/base/modal/modal';
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
        <table className="bui-table w-full">
          <thead>
            <tr>
              <th>{t('members.email')}</th>
              <th>{t('members.role')}</th>
              <th>{t('members.expiresAt')}</th>
              {canManage && <th className="text-right">{t('members.actionsColumn')}</th>}
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => {
              const invRole: OrgRole = inv.role && isOrgRole(inv.role) ? inv.role : 'viewer';

              return (
                <tr key={inv.id}>
                  <td className="text-body-medium text-text-primary">{inv.email}</td>
                  <td>
                    <Chip variant="caption" color="neutral">
                      {t(`members.roles.${invRole}`)}
                    </Chip>
                  </td>
                  <td>
                    <Caption>
                      {format.dateTime(new Date(inv.expiresAt), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Caption>
                  </td>
                  {canManage && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="small"
                          disabled={busyId === inv.id}
                          onClick={() => onResendInvitation(inv.id, inv.email, invRole)}
                        >
                          {t('members.resend')}
                        </Button>
                        <ModalTrigger>
                          <Button
                            variant="ghost"
                            size="small"
                            className="text-text-error-primary hover:bg-notification-error-background"
                            disabled={busyId === inv.id}
                          >
                            {t('members.cancelInvite')}
                          </Button>
                          <AlertDialog
                            title={t('members.cancelInviteConfirm')}
                            description={inv.email}
                            variant="danger"
                            confirmLabel={t('common.delete')}
                            cancelLabel={t('common.cancel')}
                            onConfirm={() => onCancelInvitation(inv.id, inv.email)}
                          />
                        </ModalTrigger>
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
