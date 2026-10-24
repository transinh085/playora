import { ApiError } from '@playora/api-client';
import { ErrorCode, localize } from '@playora/contracts';
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
