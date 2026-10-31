import { describe, expect, test } from 'bun:test';
import type { Route } from 'next';
import { campaignRoutes } from './routes';

describe('campaignRoutes', () => {
  test('separates live play URL (apps/play) from studio preview/rehearsal URL', () => {
    const routes = campaignRoutes('org-123');

    expect(routes.play('vong-quay-tet')).toBe('http://localhost:3002/vong-quay-tet');
    expect(routes.play('vong-quay-tet', 'table-qr')).toBe(
      'http://localhost:3002/vong-quay-tet?ch=table-qr',
    );
    expect(routes.preview('camp-456')).toBe('/orgs/org-123/campaigns/camp-456/preview' as Route);
    expect(routes.rehearsal('camp-456')).toBe('/orgs/org-123/campaigns/camp-456/preview' as Route);
  });
});
