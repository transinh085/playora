'use client';

import { magicLinkClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { API_URL } from './env';

/** Better Auth is mounted on the API at /auth. */
export const authClient = createAuthClient({
  baseURL: `${API_URL}/auth`,
  plugins: [organizationClient(), magicLinkClient()],
});

export const ORG_ROLES = ['owner', 'admin', 'editor', 'operator', 'viewer'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export function isOrgRole(role: string): role is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(role);
}

export function parseMemberRoles(role: string): OrgRole[] {
  return role
    .split(',')
    .map((r) => r.trim())
    .filter(isOrgRole);
}

export function isOwnerRole(role: string): boolean {
  return parseMemberRoles(role).includes('owner');
}

/** Matches `packages/auth/src/permissions.ts`: owner & admin hold member/invitation permissions. */
export function canManageMembers(role: string): boolean {
  const parsed = parseMemberRoles(role);
  return parsed.includes('owner') || parsed.includes('admin');
}

/** Only owners may grant the `owner` role (enforced by Better Auth `creatorRole: 'owner'`). */
export function assignableRolesFor(actorRole: string): readonly OrgRole[] {
  if (!canManageMembers(actorRole)) return [];
  return isOwnerRole(actorRole) ? ORG_ROLES : ORG_ROLES.filter((r) => r !== 'owner');
}
