'use client';

import { Avatar, Button, Popconfirm, Select, Table, type TableProps, Tag } from 'antd';
import { useTranslations } from 'next-intl';
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

  const columns: TableProps<MemberItem>['columns'] = [
    {
      title: t('members.memberColumn'),
      key: 'member',
      render: (_, member) => {
        const isSelf = member.userId === currentUserId;
        return (
          <div className="flex items-center gap-3">
            <Avatar size={32}>
              {(member.user.name || member.user.email).slice(0, 1).toUpperCase()}
            </Avatar>
            <div>
              <div className="flex items-center gap-2 font-medium">
                <span>{member.user.name}</span>
                {isSelf && <Tag variant="filled">{t('members.you')}</Tag>}
              </div>
              <div className="text-xs text-[var(--ant-color-text-secondary)]">
                {member.user.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: t('members.role'),
      key: 'role',
      render: (_, member) => {
        const primaryRole: OrgRole = parseMemberRoles(member.role)[0] ?? 'viewer';
        const isSelf = member.userId === currentUserId;
        const targetIsOwner = isOwnerRole(member.role);
        const canEditRole =
          canManage && (!targetIsOwner || (actorIsOwner && (!isSelf || ownerCount > 1)));

        if (!canEditRole) {
          return <Tag variant="filled">{t(`members.roles.${primaryRole}`)}</Tag>;
        }

        return (
          <Select<OrgRole>
            value={primaryRole}
            disabled={busyId === member.id}
            onChange={(value) => onRoleChange(member.id, value)}
            aria-label={`${t('members.role')} ${member.user.email}`}
            className="w-40"
            options={assignableRoles.map((role) => ({
              value: role,
              label: t(`members.roles.${role}`),
            }))}
          />
        );
      },
    },
    ...(canManage
      ? ([
          {
            title: t('members.actionsColumn'),
            key: 'actions',
            align: 'right' as const,
            render: (_: unknown, member: MemberItem) => {
              const isSelf = member.userId === currentUserId;
              const targetIsOwner = isOwnerRole(member.role);
              const canRemove =
                canManage && !isSelf && (!targetIsOwner || (actorIsOwner && ownerCount > 1));

              if (!canRemove) return null;

              return (
                <Popconfirm
                  title={t('members.removeConfirm')}
                  okText={t('common.delete')}
                  cancelText={t('common.cancel')}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onRemoveMember(member.id)}
                  disabled={busyId === member.id}
                >
                  <Button type="link" danger size="small" disabled={busyId === member.id}>
                    {t('members.remove')}
                  </Button>
                </Popconfirm>
              );
            },
          },
        ] satisfies TableProps<MemberItem>['columns'])
      : []),
  ];

  return (
    <Table<MemberItem> rowKey="id" dataSource={members} columns={columns} pagination={false} />
  );
}
