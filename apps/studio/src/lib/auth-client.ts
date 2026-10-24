'use client';

import { magicLinkClient, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { API_URL } from './env';

/** Better Auth is mounted on the API at /auth. */
export const authClient = createAuthClient({
  baseURL: `${API_URL}/auth`,
  plugins: [organizationClient(), magicLinkClient()],
});

export {
  assignableRolesFor,
  can,
  canManageMembers,
  isOrgRole,
  isOwnerRole,
  ORG_ROLES,
  type OrgRole,
  type PermissionRequest,
  parseMemberRoles,
} from './permissions';
