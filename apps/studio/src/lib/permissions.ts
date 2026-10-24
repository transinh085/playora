import {
  hasPermission,
  isOrgRole,
  type OrgRole,
  type PermissionRequest,
} from '@playora/auth/permissions';

export { isOrgRole, type OrgRole, type PermissionRequest };

export const ORG_ROLES = [
  'owner',
  'admin',
  'editor',
  'operator',
  'viewer',
] as const satisfies readonly OrgRole[];

/**
 * Checks whether the given member role holds the requested permissions.
 * Supports comma-separated multi-roles per Better Auth convention.
 */
export function can(role: string | null | undefined, request: PermissionRequest): boolean {
  if (!role) return false;
  return hasPermission(role, request);
}

/** Parses comma-separated role string into valid OrgRole array. */
export function parseMemberRoles(role: string | null | undefined): OrgRole[] {
  if (!role) return [];
  return role
    .split(',')
    .map((r) => r.trim())
    .filter(isOrgRole);
}

/** Returns true if the member holds the owner role. */
export function isOwnerRole(role: string | null | undefined): boolean {
  return parseMemberRoles(role).includes('owner');
}

/**
 * Checks whether the member can manage other members (invite, change roles, remove).
 * Based on the member create permission.
 */
export function canManageMembers(role: string | null | undefined): boolean {
  return can(role, { member: ['create'] });
}

/**
 * Returns roles that the actor is allowed to assign to other members.
 * Non-managers receive an empty list.
 * Only owners may assign the owner role (enforced by Better Auth creatorRole: 'owner').
 */
export function assignableRolesFor(actorRole: string | null | undefined): readonly OrgRole[] {
  if (!can(actorRole, { member: ['create'] })) return [];
  const canAssignOwner = can(actorRole, { organization: ['delete'] });
  return canAssignOwner ? ORG_ROLES : ORG_ROLES.filter((r) => r !== 'owner');
}
