import { describe, expect, test } from 'bun:test';
import { hasPermission } from './permissions';

describe('org permissions', () => {
  test('editors manage content but cannot delete events', () => {
    expect(hasPermission('editor', { game: ['publish'] })).toBe(true);
    expect(hasPermission('editor', { event: ['delete'] })).toBe(false);
  });

  test('operators only read content and cannot update events', () => {
    expect(hasPermission('operator', { event: ['read'] })).toBe(true);
    expect(hasPermission('operator', { event: ['update'] })).toBe(false);
  });

  test('viewers cannot export data', () => {
    expect(hasPermission('viewer', { export: ['create'] })).toBe(false);
    expect(hasPermission('admin', { export: ['create'] })).toBe(true);
  });

  test('multi-role members get the union and unknown roles grant nothing', () => {
    expect(hasPermission('viewer, editor', { game: ['publish'] })).toBe(true);
    expect(hasPermission('member', { event: ['read'] })).toBe(false);
  });

  test('owner, admin and editor have full asset and brandKit permissions; operator and viewer read-only', () => {
    for (const role of ['owner', 'admin', 'editor'] as const) {
      expect(hasPermission(role, { asset: ['create', 'read', 'update', 'delete'] })).toBe(true);
      expect(hasPermission(role, { brandKit: ['create', 'read', 'update', 'delete'] })).toBe(true);
    }
    for (const role of ['operator', 'viewer'] as const) {
      expect(hasPermission(role, { asset: ['read'] })).toBe(true);
      expect(hasPermission(role, { brandKit: ['read'] })).toBe(true);
      expect(hasPermission(role, { asset: ['create'] })).toBe(false);
      expect(hasPermission(role, { asset: ['update'] })).toBe(false);
      expect(hasPermission(role, { asset: ['delete'] })).toBe(false);
      expect(hasPermission(role, { brandKit: ['create'] })).toBe(false);
      expect(hasPermission(role, { brandKit: ['update'] })).toBe(false);
      expect(hasPermission(role, { brandKit: ['delete'] })).toBe(false);
    }
  });

  test('redeemers only look up and redeem vouchers', () => {
    expect(hasPermission('redeemer', { voucher: ['read', 'redeem'] })).toBe(true);
    expect(hasPermission('redeemer', { voucher: ['reopen'] })).toBe(false);
    expect(hasPermission('redeemer', { campaign: ['read'] })).toBe(false);
    expect(hasPermission('redeemer', { event: ['read'] })).toBe(false);
  });

  test('only the owner can reopen a redeemed voucher', () => {
    expect(hasPermission('owner', { voucher: ['reopen'] })).toBe(true);
    for (const role of ['admin', 'editor', 'operator', 'viewer'] as const) {
      expect(hasPermission(role, { voucher: ['reopen'] })).toBe(false);
    }
    expect(hasPermission('editor', { campaign: ['publish'] })).toBe(true);
    expect(hasPermission('viewer', { campaign: ['update'] })).toBe(false);
  });
});
