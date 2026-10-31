/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { routeKey } from '@playora/api-client';
import {
  type AssetSummary,
  assetsApi,
  type BrandKitSummary,
  brandKitsApi,
  CreateBrandKitBody,
} from '@playora/contracts';
import { getMessages } from '@playora/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { DEFAULT_BRAND_KIT_VALUES, toBrandKitFormValues } from './brand-kit-editor-card';
import { BrandKitsManager, BrandKitsManagerInner } from './brand-kits-manager';

const sampleKit: BrandKitSummary = {
  id: '22222222-2222-4222-8222-222222222222',
  organizationId: 'org_123',
  clientId: null,
  name: 'Tet Brand 2026',
  tokens: {
    colors: {
      primary: '#e11d48',
      secondary: '#f59e0b',
      background: '#4c0519',
      text: '#fff1f2',
    },
    fontHeading: 'Unbounded',
    fontBody: 'Be Vietnam Pro',
    logoAssetId: '33333333-3333-4333-8333-333333333333',
    backgroundAssetId: null,
    musicAssetId: null,
  },
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

const sampleLogoAsset: AssetSummary = {
  id: '33333333-3333-4333-8333-333333333333',
  organizationId: 'org_123',
  kind: 'image',
  mime: 'image/png',
  bytes: 2048,
  width: 320,
  height: 120,
  status: 'ready',
  url: 'https://cdn.playora.local/logo.png',
  variants: {
    w320: {
      key: 'org_123/logo-320.png',
      url: 'https://cdn.playora.local/logo-320.png',
      width: 320,
      height: 120,
    },
  },
  createdBy: 'user_123',
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

const viMessages = getMessages('vi');

describe('brand-kits helpers and components', () => {
  test('maps BrandKitSummary to form values valid against CreateBrandKitBody', () => {
    const mapped = toBrandKitFormValues(sampleKit);
    expect(mapped.name).toBe('Tet Brand 2026');
    expect(mapped.tokens.colors.primary).toBe('#e11d48');
    expect(mapped.tokens.logoAssetId).toBe(sampleLogoAsset.id);
    expect(() => CreateBrandKitBody.parse(mapped)).not.toThrow();
  });

  test('renders BrandKitsManager through loading -> loaded and kit switching', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Number.POSITIVE_INFINITY,
        },
      },
    });

    const renderManager = () =>
      renderToString(
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="vi" messages={viMessages} timeZone="Asia/Ho_Chi_Minh">
            <BrandKitsManager orgId="org_123" />
          </NextIntlClientProvider>
        </QueryClientProvider>,
      );

    // 1. Both queries pending -> renders Skeleton
    const loadingHtml = renderManager();
    expect(loadingHtml).toContain('animate-pulse');

    // 2. Brand kits resolved while assets query is still pending -> still renders Skeleton
    queryClient.setQueryData(
      routeKey(brandKitsApi.list, { params: { orgId: 'org_123' }, query: { limit: 50 } }),
      { items: [sampleKit], nextCursor: null },
    );
    const partialLoadingHtml = renderManager();
    expect(partialLoadingHtml).toContain('animate-pulse');

    // 3. Assets resolved -> mounts BrandKitsManagerInner (key="new") with Form + GameRoot preview
    queryClient.setQueryData(
      routeKey(assetsApi.list, { params: { orgId: 'org_123' }, query: { limit: 100 } }),
      { items: [sampleLogoAsset], nextCursor: null },
    );
    const loadedHtml = renderManager();

    // 4. Remounting BrandKitsManagerInner with key={sampleKit.id} initializes edit values directly
    const editingHtml = renderToString(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="vi" messages={viMessages} timeZone="Asia/Ho_Chi_Minh">
          <BrandKitsManagerInner
            key={sampleKit.id}
            orgId="org_123"
            kit={sampleKit}
            kits={[sampleKit]}
            imageAssets={[sampleLogoAsset]}
            audioAssets={[]}
            isRemoving={false}
            onEdit={() => {}}
            onResetToNew={() => {}}
            onRemove={() => {}}
          />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    expect(loadedHtml).toContain('Tet Brand 2026');
    expect(loadedHtml).toContain(DEFAULT_BRAND_KIT_VALUES.tokens.colors.primary);
    expect(loadedHtml).toContain('data-slot="game-root"');
    expect(loadedHtml).toContain('data-slot="game-button"');

    expect(editingHtml).toContain('#e11d48');
    expect(editingHtml).toContain('https://cdn.playora.local/logo-320.png');

    const labelForIds = [...loadedHtml.matchAll(/<label[^>]*for="([^"]+)"[^>]*>/g)].map(
      (m) => m[1],
    );
    const elementIds = new Set([...loadedHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    expect(labelForIds.length).toBeGreaterThan(0);
    for (const targetId of labelForIds) {
      expect(elementIds.has(targetId)).toBe(true);
    }
  });
});
