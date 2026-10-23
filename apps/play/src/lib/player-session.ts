'use client';

import type { JoinedPlayer } from '@playora/contracts';
import { useCallback, useEffect, useState } from 'react';

export interface PlayerSession {
  playerToken: string;
  player: JoinedPlayer;
}

const SESSION_KEY_PREFIX = 'playora:player:';
const DEVICE_ID_KEY = 'playora:device_id';

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    if (typeof atob === 'function') {
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(input, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export function isPlayerTokenValid(token: string, nowS = Math.floor(Date.now() / 1000)): boolean {
  if (!token || typeof token !== 'string') return false;
  const [body, mac, extra] = token.split('.');
  if (!body || !mac || extra !== undefined) return false;
  const json = decodeBase64Url(body);
  if (!json) return false;
  try {
    const parsed = JSON.parse(json) as {
      kind?: unknown;
      sub?: unknown;
      exp?: unknown;
    };
    return (
      parsed.kind === 'player' &&
      typeof parsed.sub === 'string' &&
      typeof parsed.exp === 'number' &&
      parsed.exp > nowS
    );
  } catch {
    return false;
  }
}

export function readPlayerSession(slug: string): PlayerSession | null {
  try {
    const raw = localStorage.getItem(`${SESSION_KEY_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlayerSession>;
    if (
      !parsed ||
      typeof parsed.playerToken !== 'string' ||
      !parsed.player ||
      typeof parsed.player.id !== 'string' ||
      typeof parsed.player.displayName !== 'string'
    ) {
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${slug}`);
      return null;
    }
    if (!isPlayerTokenValid(parsed.playerToken)) {
      localStorage.removeItem(`${SESSION_KEY_PREFIX}${slug}`);
      return null;
    }
    return {
      playerToken: parsed.playerToken,
      player: {
        id: parsed.player.id,
        displayName: parsed.player.displayName,
        team: parsed.player.team ?? null,
      },
    };
  } catch {
    return null;
  }
}

export function writePlayerSession(slug: string, session: PlayerSession): void {
  try {
    localStorage.setItem(`${SESSION_KEY_PREFIX}${slug}`, JSON.stringify(session));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function clearPlayerSession(slug: string): void {
  try {
    localStorage.removeItem(`${SESSION_KEY_PREFIX}${slug}`);
  } catch {
    // Ignore storage errors
  }
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.trim().length > 0) return existing;
    const next =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch {
    return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function usePlayerSession(slug: string) {
  const [session, setSessionState] = useState<PlayerSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSessionState(readPlayerSession(slug));
    setHydrated(true);
  }, [slug]);

  const setSession = useCallback(
    (next: PlayerSession) => {
      writePlayerSession(slug, next);
      setSessionState(next);
    },
    [slug],
  );

  const clearSession = useCallback(() => {
    clearPlayerSession(slug);
    setSessionState(null);
  }, [slug]);

  return {
    session,
    hydrated,
    setSession,
    clearSession,
  };
}
