import { ApiError } from '@playora/api-client';
import {
  type AssetSummary,
  type BrandKitSummary,
  ErrorCode,
  type GameSummary,
  localize,
} from '@playora/contracts';
import {
  canonicalJson,
  extractHotConfig,
  getAtPath,
  hasNonHotEditableChanges,
  PREVIEW_READY_TYPE,
  PREVIEW_UPDATE_TYPE,
  type PreviewBrand,
  PreviewMessage,
  type PreviewOutcomePreset,
  PreviewReadyMessage,
  setAtPath,
} from '@playora/game-sdk';
import { PLAY_URL } from '@/lib/env';

export {
  canonicalJson,
  extractHotConfig,
  getAtPath,
  hasNonHotEditableChanges,
  localize,
  PREVIEW_READY_TYPE,
  PREVIEW_UPDATE_TYPE,
  PreviewMessage,
  PreviewReadyMessage,
  setAtPath,
};

export const DEFAULT_BRAND_PALETTE = [
  '#F59E0B',
  '#EF4444',
  '#7C3AED',
  '#0F172A',
  '#FFFFFF',
] as const;

export const DEFAULT_BRAND_PAYLOAD: PreviewBrand = {
  colors: {
    primary: '#F59E0B',
    secondary: '#EF4444',
    accent: '#F59E0B',
    background: '#0F172A',
    text: '#F8FAFC',
  },
};

export interface GameEditorDraftState {
  initializedGameId: string | null;
  name: string;
  skinKey: string;
  draftConfig: Record<string, unknown>;
  isDirty: boolean;
  fieldErrors: Record<string, string>;
}

export function createInitialDraftState(): GameEditorDraftState {
  return {
    initializedGameId: null,
    name: '',
    skinKey: '',
    draftConfig: {},
    isDirty: false,
    fieldErrors: {},
  };
}

export function syncDraftStateFromGame(
  state: GameEditorDraftState,
  game: Pick<GameSummary, 'id' | 'name' | 'skinKey' | 'draftConfig'> | undefined,
): GameEditorDraftState {
  if (!game || state.initializedGameId === game.id) {
    return state;
  }
  return {
    initializedGameId: game.id,
    name: game.name,
    skinKey: game.skinKey ?? 'chung',
    draftConfig: game.draftConfig ?? {},
    isDirty: false,
    fieldErrors: {},
  };
}

export function editDraftName(state: GameEditorDraftState, name: string): GameEditorDraftState {
  return { ...state, name, isDirty: true };
}

export function editDraftSkinKey(
  state: GameEditorDraftState,
  skinKey: string,
): GameEditorDraftState {
  return { ...state, skinKey, isDirty: true };
}

export function editDraftConfig(
  state: GameEditorDraftState,
  draftConfig: Record<string, unknown>,
): GameEditorDraftState {
  return { ...state, draftConfig, isDirty: true };
}

export function markDraftSaved(
  state: GameEditorDraftState,
  updatedGame: Pick<GameSummary, 'draftConfig'>,
): GameEditorDraftState {
  return {
    ...state,
    draftConfig: updatedGame.draftConfig,
    isDirty: false,
    fieldErrors: {},
  };
}

export function buildUpdateGamePayload(
  state: Pick<GameEditorDraftState, 'name' | 'skinKey' | 'draftConfig'>,
) {
  return {
    name: state.name.trim() || undefined,
    skinKey: state.skinKey || null,
    draftConfig: state.draftConfig,
  };
}

export function resolveActiveBrandKit(
  kits: readonly BrandKitSummary[],
  targetBrandKitId?: string | null,
): BrandKitSummary | undefined {
  if (targetBrandKitId) {
    const found = kits.find((k) => k.id === targetBrandKitId);
    if (found) return found;
  }
  return kits[0];
}

export function resolveBrandPalette(activeBrandKit?: BrandKitSummary): string[] {
  if (!activeBrandKit) return [...DEFAULT_BRAND_PALETTE];
  const c = activeBrandKit.tokens.colors;
  return [c.primary, c.secondary, c.background, c.text].filter(
    (val): val is string => typeof val === 'string' && val.length > 0,
  );
}

export function mergeResolvedAssets(
  gameAssets: Record<string, string> | undefined,
  orgAssets: readonly AssetSummary[],
): Record<string, string> {
  const map: Record<string, string> = { ...(gameAssets ?? {}) };
  for (const a of orgAssets) {
    map[a.id] = a.variants.w640?.url ?? a.url;
  }
  return map;
}

export function resolveBrandPayload(
  activeBrandKit: BrandKitSummary | undefined,
  resolvedAssets: Record<string, string>,
): PreviewBrand {
  if (!activeBrandKit) {
    return DEFAULT_BRAND_PAYLOAD;
  }
  const logoId = activeBrandKit.tokens.logoAssetId;
  return {
    logoUrl: logoId ? resolvedAssets[logoId] : undefined,
    colors: {
      primary: activeBrandKit.tokens.colors.primary,
      secondary: activeBrandKit.tokens.colors.secondary,
      accent: activeBrandKit.tokens.colors.secondary ?? activeBrandKit.tokens.colors.primary,
      background: activeBrandKit.tokens.colors.background,
      text: activeBrandKit.tokens.colors.text,
    },
    fontHeading: activeBrandKit.tokens.fontHeading,
    fontBody: activeBrandKit.tokens.fontBody,
  };
}

export function resolvePlayOrigin(playUrl: string = PLAY_URL): string {
  return new URL(playUrl).origin;
}

export function buildPreviewUpdateMessage(input: {
  config: Record<string, unknown>;
  skinKey?: string;
  brand: PreviewBrand;
  locale: 'vi' | 'en';
  outcome: PreviewOutcomePreset;
  assets: Record<string, string>;
}): PreviewMessage {
  return PreviewMessage.parse({
    type: PREVIEW_UPDATE_TYPE,
    config: input.config,
    skinKey: input.skinKey || undefined,
    brand: input.brand,
    locale: input.locale,
    outcome: input.outcome,
    assets: input.assets,
  });
}

export function isPreviewReadyMessage(data: unknown): boolean {
  return PreviewReadyMessage.safeParse(data).success;
}

export function extractDraftFieldErrors(err: unknown): Record<string, string> {
  const extracted: Record<string, string> = {};
  if (err instanceof ApiError && err.code === ErrorCode.VALIDATION_FAILED) {
    const details = err.details as
      | { body?: { fieldErrors?: Record<string, string[]> } }
      | undefined;
    const rawFieldErrors = details?.body?.fieldErrors ?? {};
    for (const [key, messages] of Object.entries(rawFieldErrors)) {
      const normalizedKey = key.startsWith('draftConfig.') ? key.slice('draftConfig.'.length) : key;
      if (messages[0]) {
        extracted[normalizedKey] = messages[0];
      }
    }
  }
  return extracted;
}
