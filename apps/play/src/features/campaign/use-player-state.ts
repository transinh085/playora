'use client';

import { ApiError } from '@playora/api-client';
import { type PlayerState, playsApi } from '@playora/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playerApi } from '@/lib/api';

/**
 * `playsApi.me` (turns left today + "Quà của tôi") for the stored player token. Refetches when the
 * token changes; `refresh()` after each play. A 401 calls `onUnauthorized` (the token was revoked
 * or the secret rotated) so the host can drop the session.
 */
export function usePlayerState(
  slug: string,
  playerToken: string | null,
  onUnauthorized?: () => void,
) {
  const [state, setState] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(false);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;

  /** Pass the token explicitly when it changed in the same tick (right after a join). */
  const refresh = useCallback(
    async (token: string | null = playerToken) => {
      if (!token) {
        setState(null);
        return;
      }
      setLoading(true);
      try {
        setState(await playerApi(token).call(playsApi.me, { params: { slug } }));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setState(null);
          unauthorized.current?.();
        }
        // Other failures keep the last known state; the next refresh or poll tries again.
      } finally {
        setLoading(false);
      }
    },
    [slug, playerToken],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, loading, refresh };
}

/** Calls `fn` now and every `intervalMs` while `active` and the tab is visible. */
export function usePolling(active: boolean, fn: () => unknown, intervalMs: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!active) return;
    void fnRef.current();
    const id = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) void fnRef.current();
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
}
