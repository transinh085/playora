'use client';

import { Avatar } from '@playora/ui/components/base/avatar/avatar';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { AlertDialog, ModalTrigger } from '@playora/ui/components/base/modal/modal';
import { Select, SelectItem } from '@playora/ui/components/base/select/select';
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
      <div className="w-full overflow-x-auto">
        <table className="bui-table w-full">
          <thead>
            <tr>
              <th className="w-[45%]">{t('members.memberColumn')}</th>
              <th>{t('members.role')}</th>
              {canManage && <th className="text-right">{t('members.actionsColumn')}</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const primaryRole: OrgRole = parseMemberRoles(member.role)[0] ?? 'viewer';
              const targetIsOwner = isOwnerRole(member.role);
              const canEditRole =
                canManage && (!targetIsOwner || (actorIsOwner && (!isSelf || ownerCount > 1)));
              const canRemove =
                canManage && !isSelf && (!targetIsOwner || (actorIsOwner && ownerCount > 1));

              return (
                <tr key={member.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar
                        size="md"
                        src={member.user.image ?? undefined}
                        initials={(member.user.name || member.user.email).slice(0, 1).toUpperCase()}
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-body-medium text-text-primary">
                            {member.user.name}
                          </span>
                          {isSelf && (
                            <Chip variant="caption" color="soft">
                              {t('members.you')}
                            </Chip>
                          )}
                        </div>
                        <Caption>{member.user.email}</Caption>
                      </div>
                    </div>
                  </td>

                  <td>
                    {!canEditRole ? (
                      <Chip variant="caption" color="neutral">
                        {t(`members.roles.${primaryRole}`)}
                      </Chip>
                    ) : (
                      <Select
                        size="sm"
                        className="w-36"
                        selectedKey={primaryRole}
                        isDisabled={busyId === member.id}
                        aria-label={`${t('members.role')} ${member.user.email}`}
                        onSelectionChange={(key) => {
                          if (key !== null) onRoleChange(member.id, String(key) as OrgRole);
                        }}
                      >
                        {assignableRoles.map((role) => (
                          <SelectItem key={role} id={role}>
                            {t(`members.roles.${role}`)}
                          </SelectItem>
                        ))}
                      </Select>
                    )}
                  </td>

                  {canManage && (
                    <td className="text-right">
                      {canRemove && (
                        <ModalTrigger>
                          <Button
                            variant="ghost"
                            size="small"
                            className="text-text-error-primary hover:bg-notification-error-background"
                            disabled={busyId === member.id}
                          >
                            {t('members.remove')}
                          </Button>
                          <AlertDialog
                            title={t('members.removeConfirm')}
                            description={`${member.user.name} (${member.user.email})`}
                            variant="danger"
                            confirmLabel={t('common.delete')}
                            cancelLabel={t('common.cancel')}
                            onConfirm={() => onRemoveMember(member.id)}
                          />
                        </ModalTrigger>
                      )}
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
