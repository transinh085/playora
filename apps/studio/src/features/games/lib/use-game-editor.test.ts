/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { type AssetSummary, type BrandKitSummary, ErrorCode } from '@playora/contracts';
import { PREVIEW_READY_TYPE, PREVIEW_UPDATE_TYPE } from '@playora/game-sdk';
import {
  buildPreviewUpdateMessage,
  buildUpdateGamePayload,
  createInitialDraftState,
  DEFAULT_BRAND_PALETTE,
  DEFAULT_BRAND_PAYLOAD,
  editDraftConfig,
  editDraftName,
  editDraftSkinKey,
  extractDraftFieldErrors,
  isPreviewReadyMessage,
  markDraftSaved,
  mergeResolvedAssets,
  resolveActiveBrandKit,
  resolveBrandPalette,
  resolveBrandPayload,
  resolvePlayOrigin,
  syncDraftStateFromGame,
} from './builder-helpers';

describe('builder-helpers & useGameEditor draft state logic', () => {
  test('syncs draft state from game once per gameId and preserves unsaved edits on refetch', () => {
    const initial = createInitialDraftState();
    expect(initial.initializedGameId).toBeNull();
    expect(initial.isDirty).toBe(false);

    const synced = syncDraftStateFromGame(initial, {
      id: 'game_1',
      name: 'Vòng quay 1',
      skinKey: 'tet',
      draftConfig: { spins: 5 },
    });
    expect(synced.initializedGameId).toBe('game_1');
    expect(synced.name).toBe('Vòng quay 1');
    expect(synced.skinKey).toBe('tet');
    expect(synced.draftConfig).toEqual({ spins: 5 });
    expect(synced.isDirty).toBe(false);

    const edited = editDraftConfig(editDraftName(synced, 'Vòng quay mới'), { spins: 8 });
    expect(edited.isDirty).toBe(true);
    expect(edited.name).toBe('Vòng quay mới');
    expect(edited.draftConfig).toEqual({ spins: 8 });

    // Background refetch of the same gameId should not clobber dirty state
    const afterRefetch = syncDraftStateFromGame(edited, {
      id: 'game_1',
      name: 'Vòng quay 1',
      skinKey: 'tet',
      draftConfig: { spins: 5 },
    });
    expect(afterRefetch).toBe(edited);

    // Switching to another gameId re-initializes state
    const switched = syncDraftStateFromGame(edited, {
      id: 'game_2',
      name: 'Vòng quay 2',
      skinKey: null,
      draftConfig: { spins: 4 },
    });
    expect(switched.initializedGameId).toBe('game_2');
    expect(switched.skinKey).toBe('chung');
    expect(switched.isDirty).toBe(false);
  });

  test('tracks skin changes, builds update payload, and resets dirty/errors when saved', () => {
    const base = syncDraftStateFromGame(createInitialDraftState(), {
      id: 'game_1',
      name: '  Vòng quay Tết  ',
      skinKey: 'chung',
      draftConfig: { spins: 5 },
    });

    const withSkin = editDraftSkinKey(base, 'tet');
    expect(withSkin.isDirty).toBe(true);
    expect(withSkin.skinKey).toBe('tet');

    const payload = buildUpdateGamePayload(withSkin);
    expect(payload).toEqual({
      name: 'Vòng quay Tết',
      skinKey: 'tet',
      draftConfig: { spins: 5 },
    });

    const saved = markDraftSaved(
      { ...withSkin, fieldErrors: { spins: 'Invalid' } },
      { draftConfig: { spins: 6 } },
    );
    expect(saved.isDirty).toBe(false);
    expect(saved.fieldErrors).toEqual({});
    expect(saved.draftConfig).toEqual({ spins: 6 });
  });

  test('resolves active brand kit, palette, assets, and brand payload', () => {
    expect(resolveActiveBrandKit([], null)).toBeUndefined();
    expect(resolveBrandPalette(undefined)).toEqual([...DEFAULT_BRAND_PALETTE]);
    expect(resolveBrandPayload(undefined, {})).toEqual(DEFAULT_BRAND_PAYLOAD);

    const kits: BrandKitSummary[] = [
      {
        id: 'bk_1',
        organizationId: 'org_1',
        clientId: null,
        name: 'Default Kit',
        tokens: {
          logoAssetId: 'asset_logo',
          colors: {
            primary: '#111111',
            secondary: '#222222',
            background: '#333333',
            text: '#444444',
          },
          fontHeading: 'Montserrat',
          fontBody: 'Inter',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'bk_2',
        organizationId: 'org_1',
        clientId: null,
        name: 'Tet Kit',
        tokens: {
          colors: {
            primary: '#DC2626',
            background: '#7F1D1D',
            text: '#FEF2F2',
          },
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(resolveActiveBrandKit(kits, 'bk_2')?.id).toBe('bk_2');
    expect(resolveActiveBrandKit(kits, 'bk_missing')?.id).toBe('bk_1');

    const orgAssets: AssetSummary[] = [
      {
        id: 'asset_logo',
        organizationId: 'org_1',
        kind: 'image',
        mime: 'image/png',
        bytes: 1024,
        width: 512,
        height: 512,
        status: 'ready',
        url: 'https://cdn.playora.local/logo-orig.png',
        variants: {
          w640: {
            key: 'assets/logo-640.webp',
            url: 'https://cdn.playora.local/logo-640.png',
            width: 512,
            height: 512,
          },
        },
        createdBy: 'user_1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const resolvedAssets = mergeResolvedAssets({ existing: 'https://a.local/1.png' }, orgAssets);
    expect(resolvedAssets).toEqual({
      existing: 'https://a.local/1.png',
      asset_logo: 'https://cdn.playora.local/logo-640.png',
    });

    const payload = resolveBrandPayload(kits[0], resolvedAssets);
    expect(payload.logoUrl).toBe('https://cdn.playora.local/logo-640.png');
    expect(payload.colors?.primary).toBe('#111111');
    expect(payload.colors?.accent).toBe('#222222');
    expect(payload.fontHeading).toBe('Montserrat');
  });

  test('validates preview protocol messages and extracts draftConfig field errors', () => {
    expect(resolvePlayOrigin('http://localhost:3002/some/path')).toBe('http://localhost:3002');
    expect(isPreviewReadyMessage({ type: PREVIEW_READY_TYPE })).toBe(true);
    expect(isPreviewReadyMessage({ type: 'other' })).toBe(false);

    const msg = buildPreviewUpdateMessage({
      config: { spins: 7 },
      skinKey: 'tet',
      brand: DEFAULT_BRAND_PAYLOAD,
      locale: 'vi',
      outcome: 'win',
      assets: {},
    });
    expect(msg.type).toBe(PREVIEW_UPDATE_TYPE);
    expect(msg.config).toEqual({ spins: 7 });

    const apiErr = new ApiError(400, ErrorCode.VALIDATION_FAILED, 'Invalid', {
      body: {
        fieldErrors: {
          'draftConfig.spins': ['Too many spins'],
          name: ['Name required'],
        },
      },
    });
    expect(extractDraftFieldErrors(apiErr)).toEqual({
      spins: 'Too many spins',
      name: 'Name required',
    });
  });
});
