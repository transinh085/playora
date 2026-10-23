'use client';

import type { ClientToServerEvents, ServerToClientEvents } from '@playora/contracts';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type LiveSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const SPIKE_EVENT = 'spike';

/** Opens one socket per mount; M1 moves this into packages/realtime-client with resume + clock sync. */
export function useLiveSocket<V>(
  query: Record<string, string> | null,
  auth: Record<string, string> = {},
) {
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<V | null>(null);
  const socketRef = useRef<LiveSocket | null>(null);
  const key = query ? JSON.stringify(query) : null;
  const authKey = JSON.stringify(auth);

  useEffect(() => {
    if (!key) return;
    const socket: LiveSocket = io(`${process.env.NEXT_PUBLIC_REALTIME_URL}/live`, {
      query: JSON.parse(key),
      auth: JSON.parse(authKey),
      transports: ['websocket'],
    });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('round.view', (payload) => setView(payload.view as V));
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [key, authKey]);

  return { connected, view, socket: socketRef };
}

export function formatCountdown(endsAt: number | null, now: number) {
  if (!endsAt) return '';
  return `${Math.max(0, Math.ceil((endsAt - now) / 1000))}s`;
}
