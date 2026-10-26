import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, ownerAc } from 'better-auth/plugins/organization/access';

/**
 * Organization RBAC (docs/product/prd.md ORG-02). Better Auth enforces these on its own org endpoints
 * (invite, change role…); the API reuses the same roles through `authorize()`.
 */
export const statements = {
  ...defaultStatements,
  event: ['create', 'read', 'update', 'delete'],
  game: ['create', 'read', 'update', 'delete', 'publish'],
  prize: ['create', 'read', 'update', 'delete'],
  asset: ['create', 'read', 'update', 'delete'],
  brandKit: ['create', 'read', 'update', 'delete'],
  campaign: ['create', 'read', 'update', 'delete', 'publish'],
  voucher: ['read', 'redeem', 'reopen'],
  export: ['create'],
  audit: ['read'],
} as const;

export const ac = createAccessControl(statements);

const content = {
  event: ['create', 'read', 'update', 'delete'],
  game: ['create', 'read', 'update', 'delete', 'publish'],
  prize: ['create', 'read', 'update', 'delete'],
  asset: ['create', 'read', 'update', 'delete'],
  brandKit: ['create', 'read', 'update', 'delete'],
  campaign: ['create', 'read', 'update', 'delete', 'publish'],
  voucher: ['read', 'redeem'],
} as const;

export const roles = {
  owner: ac.newRole({
    ...ownerAc.statements,
    ...content,
    // Only the owner can undo a redemption (docs/product/specs/prizes-redemption.md §6.2).
    voucher: ['read', 'redeem', 'reopen'],
    export: ['create'],
    audit: ['read'],
  }),
  admin: ac.newRole({ ...adminAc.statements, ...content, export: ['create'], audit: ['read'] }),
  editor: ac.newRole({ ...content, event: ['create', 'read', 'update'] }),
  operator: ac.newRole({
    campaign: ['read'],
    voucher: ['read', 'redeem'],
    event: ['read'],
    game: ['read'],
    prize: ['read'],
    asset: ['read'],
    brandKit: ['read'],
  }),
  viewer: ac.newRole({
    campaign: ['read'],
    voucher: ['read'],
    event: ['read'],
    game: ['read'],
    prize: ['read'],
    asset: ['read'],
    brandKit: ['read'],
  }),
  /** Counter staff ("chỉ đổi quà"): look up and redeem codes, nothing else. */
  redeemer: ac.newRole({ voucher: ['read', 'redeem'] }),
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
