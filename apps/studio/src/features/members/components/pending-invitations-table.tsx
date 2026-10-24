'use client';

import { Button, Empty, Popconfirm, Table, type TableProps, Tag } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
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

  const columns: TableProps<InvitationItem>['columns'] = [
    {
      title: t('members.email'),
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <span className="font-medium">{email}</span>,
    },
    {
      title: t('members.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string | null | undefined) => {
        const invRole: OrgRole = role && isOrgRole(role) ? role : 'viewer';
        return <Tag bordered={false}>{t(`members.roles.${invRole}`)}</Tag>;
      },
    },
    {
      title: t('members.expiresAt'),
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (expiresAt: string | Date) => (
        <span className="text-xs text-[var(--ant-color-text-secondary)]">
          {format.dateTime(new Date(expiresAt), {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    ...(canManage
      ? ([
          {
            title: t('members.actionsColumn'),
            key: 'actions',
            align: 'right' as const,
            render: (_: unknown, inv: InvitationItem) => {
              const invRole: OrgRole = inv.role && isOrgRole(inv.role) ? inv.role : 'viewer';
              return (
                <div className="flex justify-end gap-2">
                  <Button
                    size="small"
                    disabled={busyId === inv.id}
                    onClick={() => onResendInvitation(inv.id, inv.email, invRole)}
                  >
                    {t('members.resend')}
                  </Button>
                  <Popconfirm
                    title={t('members.cancelInviteConfirm')}
                    okText={t('common.delete')}
                    cancelText={t('common.cancel')}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => onCancelInvitation(inv.id, inv.email)}
                    disabled={busyId === inv.id}
                  >
                    <Button type="link" danger size="small" disabled={busyId === inv.id}>
                      {t('members.cancelInvite')}
                    </Button>
                  </Popconfirm>
                </div>
              );
            },
          },
        ] satisfies TableProps<InvitationItem>['columns'])
      : []),
  ];

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t('members.pendingTitle')}</h2>
      {invitations.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('members.pendingEmpty')}
          className="my-6"
        />
      ) : (
        <Table<InvitationItem>
          rowKey="id"
          dataSource={invitations}
          columns={columns}
          pagination={false}
        />
      )}
    </section>
  );
}
