import { describe, expect, test } from 'bun:test';
import { hasPermission } from './permissions';

describe('org permissions', () => {
  test('editors manage content but cannot delete events', () => {
    expect(hasPermission('editor', { game: ['publish'] })).toBe(true);
    expect(hasPermission('editor', { event: ['delete'] })).toBe(false);
  });

  test('operators run live shows and only read content', () => {
    expect(hasPermission('operator', { live: ['operate'] })).toBe(true);
    expect(hasPermission('operator', { event: ['update'] })).toBe(false);
  });

  test('viewers cannot export data', () => {
    expect(hasPermission('viewer', { export: ['create'] })).toBe(false);
    expect(hasPermission('admin', { export: ['create'] })).toBe(true);
  });

  test('multi-role members get the union and unknown roles grant nothing', () => {
    expect(hasPermission('viewer, operator', { live: ['operate'] })).toBe(true);
    expect(hasPermission('member', { event: ['read'] })).toBe(false);
  });
});
