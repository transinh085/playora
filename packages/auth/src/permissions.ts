import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, ownerAc } from 'better-auth/plugins/organization/access';

/**
 * Organization RBAC (docs/prd.md ORG-02). Better Auth enforces these on its own org endpoints
 * (invite, change role…); the API reuses the same roles through `authorize()`.
 */
export const statements = {
  ...defaultStatements,
  event: ['create', 'read', 'update', 'delete'],
  game: ['create', 'read', 'update', 'delete', 'publish'],
  prize: ['create', 'read', 'update', 'delete'],
  live: ['operate'],
  export: ['create'],
  audit: ['read'],
} as const;

export const ac = createAccessControl(statements);

const content = {
  event: ['create', 'read', 'update', 'delete'],
  game: ['create', 'read', 'update', 'delete', 'publish'],
  prize: ['create', 'read', 'update', 'delete'],
  live: ['operate'],
} as const;

export const roles = {
  owner: ac.newRole({ ...ownerAc.statements, ...content, export: ['create'], audit: ['read'] }),
  admin: ac.newRole({ ...adminAc.statements, ...content, export: ['create'], audit: ['read'] }),
  editor: ac.newRole({ ...content, event: ['create', 'read', 'update'] }),
  operator: ac.newRole({ event: ['read'], game: ['read'], prize: ['read'], live: ['operate'] }),
  viewer: ac.newRole({ event: ['read'], game: ['read'], prize: ['read'] }),
};

export type OrgRole = keyof typeof roles;
export type Statements = typeof statements;
export type PermissionRequest = { [K in keyof Statements]?: Array<Statements[K][number]> };

export function isOrgRole(role: string): role is OrgRole {
  return Object.hasOwn(roles, role);
}

/** Members may hold several comma-separated roles (Better Auth convention); any match grants access. */
export function hasPermission(memberRole: string, request: PermissionRequest): boolean {
  return memberRole
    .split(',')
    .map((r) => r.trim())
    .filter(isOrgRole)
    .some((role) => roles[role].authorize(request).success);
}
