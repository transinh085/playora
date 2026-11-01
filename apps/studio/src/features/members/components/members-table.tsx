'use client';

import { AlertDialog, Avatar, Button, Chip, ListBox, Select } from '@playora/ui/components';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    memberId: string;
    memberName: string;
    nextRole: OrgRole;
  } | null>(null);

  return (
    <TableCard>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-body-2-regular">
          <thead>
            <tr className="border-b border-separator-border text-caption-1-semibold text-text-secondary">
              <th className="w-[45%] px-4 py-3">{t('members.memberColumn')}</th>
              <th className="px-4 py-3">{t('members.role')}</th>
              {canManage && <th className="px-4 py-3 text-right">{t('members.actionsColumn')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-separator-border">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const primaryRole: OrgRole = parseMemberRoles(member.role)[0] ?? 'viewer';
              const targetIsOwner = isOwnerRole(member.role);
              const canEditRole =
                canManage && (!targetIsOwner || (actorIsOwner && (!isSelf || ownerCount > 1)));
              const canRemove =
                canManage && !isSelf && (!targetIsOwner || (actorIsOwner && ownerCount > 1));

              return (
                <tr key={member.id} className="hover:bg-background-secondary-default/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar size="sm" color="accent">
                        {member.user.image ? (
                          <Avatar.Image src={member.user.image} alt={member.user.name} />
                        ) : null}
                        <Avatar.Fallback>
                          {(member.user.name || member.user.email).slice(0, 1).toUpperCase()}
                        </Avatar.Fallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-body-medium text-text-primary">
                            {member.user.name}
                          </span>
                          {isSelf && (
                            <Chip variant="soft" color="accent" size="sm">
                              {t('members.you')}
                            </Chip>
                          )}
                        </div>
                        <Caption>{member.user.email}</Caption>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {!canEditRole ? (
                      <Chip variant="soft" color="default" size="sm">
                        {t(`members.roles.${primaryRole}`)}
                      </Chip>
                    ) : (
                      <Select
                        className="w-36"
                        selectedKey={primaryRole}
                        isDisabled={busyId === member.id}
                        aria-label={`${t('members.role')} ${member.user.email}`}
                        onSelectionChange={(key) => {
                          if (key !== null && String(key) !== primaryRole) {
                            setPendingRoleChange({
                              memberId: member.id,
                              memberName: member.user.name || member.user.email,
                              nextRole: String(key) as OrgRole,
                            });
                          }
                        }}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {assignableRoles.map((role) => (
                              <ListBox.Item
                                key={role}
                                id={role}
                                textValue={t(`members.roles.${role}`)}
                              >
                                {t(`members.roles.${role}`)}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  </td>

                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      {canRemove && (
                        <AlertDialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-text-error-primary hover:bg-notification-error-background"
                            isDisabled={busyId === member.id}
                          >
                            {t('members.remove')}
                          </Button>
                          <AlertDialog.Backdrop isDismissable>
                            <AlertDialog.Container size="sm">
                              <AlertDialog.Dialog>
                                <AlertDialog.CloseTrigger />
                                <AlertDialog.Header>
                                  <AlertDialog.Icon status="danger" />
                                  <AlertDialog.Heading>
                                    {t('members.removeConfirm')}
                                  </AlertDialog.Heading>
                                </AlertDialog.Header>
                                <AlertDialog.Body>
                                  <p className="text-body-2-regular text-text-secondary">
                                    {`${member.user.name} (${member.user.email})`}
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
                                    onPress={() => onRemoveMember(member.id)}
                                  >
                                    {t('common.delete')}
                                  </Button>
                                </AlertDialog.Footer>
                              </AlertDialog.Dialog>
                            </AlertDialog.Container>
                          </AlertDialog.Backdrop>
                        </AlertDialog>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog
        isOpen={pendingRoleChange !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRoleChange(null);
        }}
      >
        <AlertDialog.Backdrop isDismissable>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Heading>{t('members.changeRoleConfirmTitle')}</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-body-2-regular text-text-secondary">
                  {pendingRoleChange
                    ? t('members.changeRoleConfirmDescription', {
                        name: pendingRoleChange.memberName,
                        role: t(`members.roles.${pendingRoleChange.nextRole}`),
                      })
                    : ''}
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="secondary"
                  size="sm"
                  onPress={() => setPendingRoleChange(null)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  slot="close"
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    if (pendingRoleChange) {
                      onRoleChange(pendingRoleChange.memberId, pendingRoleChange.nextRole);
                      setPendingRoleChange(null);
                    }
                  }}
                >
                  {t('common.save')}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </TableCard>
  );
}
