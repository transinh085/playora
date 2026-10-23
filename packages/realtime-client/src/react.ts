'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { connectLive, type LiveConnectOptions, type LiveSocket, syncClock } from './index';

export interface LiveRoomState<V> {
  connected: boolean;
  view: V | null;
  /** Server-aligned clock for countdowns. */
  serverNow: () => number;
  socket: React.RefObject<LiveSocket | null>;
}

/** One socket per mounted component; reconnects automatically and keeps the last view. */
export function useLiveRoom<V>(options: LiveConnectOptions | null): LiveRoomState<V> {
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<V | null>(null);
  const socket = useRef<LiveSocket | null>(null);
  const offset = useRef(0);
  const key = options ? JSON.stringify(options) : null;

  useEffect(() => {
    if (!key) return;
    const s = connectLive(JSON.parse(key) as LiveConnectOptions);
    socket.current = s;
    s.on('connect', () => {
      setConnected(true);
      syncClock(s)
        .then((value) => {
          offset.current = value;
        })
        .catch(() => {});
    });
    s.on('disconnect', () => setConnected(false));
    s.on('round.view', (payload) => setView(payload.view as V));
    return () => {
      s.close();
      socket.current = null;
    };
  }, [key]);

  // Stable identity so callers can list it in effect dependencies.
  const serverNow = useCallback(() => Date.now() + offset.current, []);
  return { connected, view, socket, serverNow };
}
