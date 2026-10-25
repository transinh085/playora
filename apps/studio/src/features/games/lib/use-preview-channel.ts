'use client';

import type { PreviewBrand, PreviewOutcomePreset } from '@playora/game-sdk';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PLAY_URL } from '@/lib/env';
import {
  buildPreviewUpdateMessage,
  isPreviewReadyMessage,
  resolvePlayOrigin,
} from './builder-helpers';

export interface PreviewChannelInput {
  templateId: string;
  config: Record<string, unknown>;
  skinKey?: string;
  brand: PreviewBrand;
  locale: 'vi' | 'en';
  outcome: PreviewOutcomePreset;
  assets: Record<string, string>;
  playUrl?: string;
}

/**
 * Drives a Play `/preview` iframe: sends the draft over `postMessage` whenever it changes and
 * again when the runtime reports it is ready. Shared by the editor preview and the template gallery.
 */
export function usePreviewChannel({
  templateId,
  config,
  skinKey,
  brand,
  locale,
  outcome,
  assets,
  playUrl = PLAY_URL,
}: PreviewChannelInput) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playOrigin = useMemo(() => resolvePlayOrigin(playUrl), [playUrl]);
  const previewSrc = `${playUrl}/preview?template=${encodeURIComponent(templateId)}`;

  const post = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const message = buildPreviewUpdateMessage({
      config,
      skinKey: skinKey || undefined,
      brand,
      locale,
      outcome,
      assets,
    });
    win.postMessage(message, playOrigin);
  }, [config, skinKey, brand, locale, outcome, assets, playOrigin]);

  useEffect(() => {
    post();
  }, [post]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== playOrigin) return;
      if (isPreviewReadyMessage(event.data)) post();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post, playOrigin]);

  return { iframeRef, previewSrc, onLoad: post };
}
