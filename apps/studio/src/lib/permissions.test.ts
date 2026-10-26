/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import {
  assignableRolesFor,
  can,
  canManageMembers,
  isOrgRole,
  isOwnerRole,
  isRedeemerOnly,
  ORG_ROLES,
  parseMemberRoles,
} from './permissions';

describe('studio permissions', () => {
  describe('can', () => {
    test('evaluates permissions for owner', () => {
      expect(can('owner', { member: ['create'] })).toBe(true);
      expect(can('owner', { member: ['delete'] })).toBe(true);
      expect(can('owner', { organization: ['delete'] })).toBe(true);
      expect(can('owner', { game: ['publish'] })).toBe(true);
    });

    test('evaluates permissions for admin', () => {
      expect(can('admin', { member: ['create'] })).toBe(true);
      expect(can('admin', { member: ['delete'] })).toBe(true);
      expect(can('admin', { invitation: ['create'] })).toBe(true);
      expect(can('admin', { organization: ['delete'] })).toBe(false);
    });

    test('evaluates permissions for editor, operator, viewer', () => {
      expect(can('editor', { member: ['create'] })).toBe(false);
      expect(can('editor', { game: ['publish'] })).toBe(true);
      expect(can('editor', { event: ['delete'] })).toBe(false);

      expect(can('operator', { member: ['create'] })).toBe(false);
      expect(can('operator', { event: ['read'] })).toBe(true);
      expect(can('operator', { event: ['update'] })).toBe(false);

      expect(can('viewer', { member: ['create'] })).toBe(false);
      expect(can('viewer', { event: ['read'] })).toBe(true);
      expect(can('viewer', { export: ['create'] })).toBe(false);

      expect(can('redeemer', { voucher: ['read', 'redeem'] })).toBe(true);
      expect(can('redeemer', { campaign: ['read'] })).toBe(false);
      expect(can('redeemer', { voucher: ['reopen'] })).toBe(false);
    });

    test('handles multi-role strings', () => {
      expect(can('viewer, editor', { game: ['publish'] })).toBe(true);
      expect(can('operator, admin', { member: ['create'] })).toBe(true);
      expect(can('viewer, operator', { member: ['create'] })).toBe(false);
    });

    test('returns false for null, undefined, empty, or unknown roles', () => {
      expect(can(null, { member: ['create'] })).toBe(false);
      expect(can(undefined, { member: ['create'] })).toBe(false);
      expect(can('', { member: ['create'] })).toBe(false);
      expect(can('guest', { event: ['read'] })).toBe(false);
    });
  });

  describe('isOrgRole', () => {
    test('validates org roles', () => {
      for (const role of ORG_ROLES) {
        expect(isOrgRole(role)).toBe(true);
      }
      expect(isOrgRole('guest')).toBe(false);
      expect(isOrgRole('')).toBe(false);
    });
  });

  describe('parseMemberRoles', () => {
    test('parses comma-separated roles and ignores invalid ones', () => {
      expect(parseMemberRoles('owner')).toEqual(['owner']);
      expect(parseMemberRoles('admin, editor')).toEqual(['admin', 'editor']);
      expect(parseMemberRoles('invalid, viewer, foo')).toEqual(['viewer']);
      expect(parseMemberRoles('')).toEqual([]);
      expect(parseMemberRoles(null)).toEqual([]);
      expect(parseMemberRoles(undefined)).toEqual([]);
    });
  });

  describe('isOwnerRole', () => {
    test('identifies owner role correctly', () => {
      expect(isOwnerRole('owner')).toBe(true);
      expect(isOwnerRole('admin, owner')).toBe(true);
      expect(isOwnerRole('admin')).toBe(false);
      expect(isOwnerRole('editor')).toBe(false);
      expect(isOwnerRole(null)).toBe(false);
      expect(isOwnerRole(undefined)).toBe(false);
    });
  });

  describe('canManageMembers', () => {
    test('owner and admin can manage members', () => {
      expect(canManageMembers('owner')).toBe(true);
      expect(canManageMembers('admin')).toBe(true);
      expect(canManageMembers('editor')).toBe(false);
      expect(canManageMembers('operator')).toBe(false);
      expect(canManageMembers('viewer')).toBe(false);
      expect(canManageMembers(null)).toBe(false);
      expect(canManageMembers(undefined)).toBe(false);
    });
  });

  describe('isRedeemerOnly', () => {
    test('returns true only when every role is redeemer', () => {
      expect(isRedeemerOnly('redeemer')).toBe(true);
      expect(isRedeemerOnly('redeemer, viewer')).toBe(false);
      expect(isRedeemerOnly('owner')).toBe(false);
      expect(isRedeemerOnly('')).toBe(false);
      expect(isRedeemerOnly(null)).toBe(false);
      expect(isRedeemerOnly(undefined)).toBe(false);
    });
  });

  describe('assignableRolesFor', () => {
    test('owner can assign all org roles including owner', () => {
      expect(assignableRolesFor('owner')).toEqual(ORG_ROLES);
      expect(assignableRolesFor('admin, owner')).toEqual(ORG_ROLES);
    });

    test('admin can assign all org roles except owner', () => {
      const adminAssignable = assignableRolesFor('admin');
      expect(adminAssignable).toEqual(['admin', 'editor', 'operator', 'viewer', 'redeemer']);
      expect(adminAssignable).not.toContain('owner');
    });

    test('non-managers cannot assign any roles', () => {
      expect(assignableRolesFor('editor')).toEqual([]);
      expect(assignableRolesFor('operator')).toEqual([]);
      expect(assignableRolesFor('viewer')).toEqual([]);
      expect(assignableRolesFor('invalid')).toEqual([]);
      expect(assignableRolesFor(null)).toEqual([]);
      expect(assignableRolesFor(undefined)).toEqual([]);
    });
  });
});
