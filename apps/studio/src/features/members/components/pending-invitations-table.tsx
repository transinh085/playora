'use client';

import { Button, Empty, Flex, Popconfirm, Table, type TableProps, Tag, Typography } from 'antd';
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

  const columns: TableProps<InvitationItem>['columns'] = [
    {
      title: t('members.email'),
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => <Typography.Text strong>{email}</Typography.Text>,
    },
    {
      title: t('members.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string | null | undefined) => {
        const invRole: OrgRole = role && isOrgRole(role) ? role : 'viewer';
        return <Tag variant="filled">{t(`members.roles.${invRole}`)}</Tag>;
      },
    },
    {
      title: t('members.expiresAt'),
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (expiresAt: string | Date) => (
        <Caption>
          {format.dateTime(new Date(expiresAt), {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </Caption>
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
                <Flex justify="end" gap={8}>
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
                </Flex>
              );
            },
          },
        ] satisfies TableProps<InvitationItem>['columns'])
      : []),
  ];

  return (
    <section className="flex flex-col gap-3">
      <Typography.Title level={5} className="!m-0">
        {t('members.pendingTitle')}
      </Typography.Title>
      <TableCard>
        <Table<InvitationItem>
          rowKey="id"
          dataSource={invitations}
          columns={columns}
          pagination={false}
          scroll={{ x: 560 }}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('members.pendingEmpty')} />
            ),
          }}
        />
      </TableCard>
    </section>
  );
}
