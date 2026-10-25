'use client';

import { useCallback, useEffect, useState } from 'react';

const storageKey = (campaignId: string) => `playora.builderLab.player.${campaignId}`;

/**
 * Anonymous player id per campaign, kept in localStorage like the real Play app's device id.
 * Empty until hydrated (localStorage is browser-only). `reset` starts a brand-new player.
 */
export function usePlayerId(campaignId: string): [string, () => void] {
  const [id, setId] = useState('');

  useEffect(() => {
    let stored = '';
    try {
      stored = window.localStorage.getItem(storageKey(campaignId)) ?? '';
    } catch {
      // Private mode: fall through to a fresh id for this page view.
    }
    if (!stored) {
      stored = crypto.randomUUID();
      try {
        window.localStorage.setItem(storageKey(campaignId), stored);
      } catch {}
    }
    setId(stored);
  }, [campaignId]);

  const reset = useCallback(() => {
    const next = crypto.randomUUID();
    try {
      window.localStorage.setItem(storageKey(campaignId), next);
    } catch {}
    setId(next);
  }, [campaignId]);

  return [id, reset];
}
