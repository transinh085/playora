import { describe, expect, test } from 'bun:test';
import { allRoutes, buildOpenApiDocument, buildPath } from './index';

describe('route contracts', () => {
  test('buildPath fills and encodes params', () => {
    expect(buildPath('/orgs/:orgId/events/:eventId', { orgId: 'a b', eventId: '1' })).toBe(
      '/orgs/a%20b/events/1',
    );
    expect(() => buildPath('/orgs/:orgId', {})).toThrow('Missing path param "orgId"');
  });

  test('method + path pairs are unique', () => {
    const keys = allRoutes.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('routes with a permission are scoped by :orgId', () => {
    for (const route of allRoutes.filter((r) => r.permission)) {
      expect(route.path).toContain(':orgId');
      expect(route.auth).toBe('session');
    }
  });

  test('OpenAPI document covers every route', () => {
    const doc = buildOpenApiDocument(allRoutes, { title: 't', version: '0', serverUrl: '/v1' });
    const operations = Object.values(doc.paths).flatMap((p) => Object.keys(p));
    expect(operations).toHaveLength(allRoutes.length);
    expect(doc.paths['/orgs/{orgId}/events']).toHaveProperty('post.requestBody');
  });
});
