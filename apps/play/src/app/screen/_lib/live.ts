'use client';

import type {
  EventState,
  LiveConnectError,
  RoundResultPayload,
  RoundView,
} from '@playora/contracts';
import { connectLive, type LiveSocket, syncClock } from '@playora/realtime-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { REALTIME_URL } from '@/lib/live';

export const RECONNECT_OVERLAY_DELAY_MS = 2_000;

export interface ScreenLiveOptions {
  eventId: string;
  screenKey: string;
  enabled?: boolean;
}

export interface ScreenLiveState {
  connected: boolean;
  /** True after the socket has been disconnected for > 2s (docs/07 §4.4). */
  reconnecting: boolean;
  /** Set when the realtime server refuses the handshake (e.g. `UNAUTHORIZED` on revoked screen). */
  refusedReason: LiveConnectError | null;
  eventState: EventState | null;
  roundView: RoundView | null;
  roundResult: RoundResultPayload | null;
  degradeLevel: 0 | 1 | 2;
  serverNow: () => number;
}

/**
 * Screen realtime adapter wrapping `@playora/realtime-client` (`connectLive`).
 * Keeps all realtime usage in one place so `apps/realtime` / `packages/realtime-client`
 * changes can be pointed here cleanly.
 */
export function useScreenLive(options: ScreenLiveOptions | null): ScreenLiveState {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [refusedReason, setRefusedReason] = useState<LiveConnectError | null>(null);
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [roundView, setRoundView] = useState<RoundView | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResultPayload | null>(null);
  const [degradeLevel, setDegradeLevel] = useState<0 | 1 | 2>(0);

  const socketRef = useRef<LiveSocket | null>(null);
  const offsetRef = useRef(0);
  const lastSeqRef = useRef(0);

  const eventId = options?.enabled !== false ? (options?.eventId ?? '') : '';
  const screenKey = options?.enabled !== false ? (options?.screenKey ?? '') : '';

  useEffect(() => {
    if (!eventId || !screenKey) return;

    let cancelled = false;
    let socket: LiveSocket | null = null;

    function openSocket() {
      if (cancelled) return;
      socket = connectLive({
        url: REALTIME_URL,
        eventId,
        role: 'screen',
        auth: { screenKey },
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        setReconnecting(false);
        setRefusedReason(null);

        if (socket) {
          syncClock(socket)
            .then((offset) => {
              offsetRef.current = offset;
            })
            .catch(() => {});

          socket
            .timeout(3_000)
            .emitWithAck('session.resume', { lastSeq: lastSeqRef.current })
            .then((res) => {
              if (res?.snapshot) {
                setEventState(res.snapshot.state);
                setRoundView(res.snapshot.view);
                if (res.snapshot.view) {
                  lastSeqRef.current = res.snapshot.view.seq;
                }
              }
            })
            .catch(() => {});
        }
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('connect_error', (err: Error) => {
        setConnected(false);
        const code = err.message as LiveConnectError;
        if (code === 'UNAUTHORIZED') {
          setRefusedReason('UNAUTHORIZED');
          socket?.close();
        } else if (code === 'EVENT_NOT_LIVE') {
          setRefusedReason('EVENT_NOT_LIVE');
        }
      });

      socket.on('event.state', (state) => {
        setEventState(state);
        if (state.round === null) {
          setRoundView(null);
        }
      });

      socket.on('round.view', (view) => {
        lastSeqRef.current = view.seq;
        setRoundView(view);
      });

      socket.on('round.result', (result) => {
        setRoundResult(result);
      });

      socket.on('system.degrade', (payload) => {
        setDegradeLevel(payload.level);
      });
    }

    fetch(`${REALTIME_URL.replace(/\/$/, '')}/health`, { cache: 'no-store' })
      .then((res) => {
        if (res.ok) openSocket();
      })
      .catch(() => {
        // Realtime server unreachable; stay in reconnecting state without noisy WS errors
      });

    return () => {
      cancelled = true;
      socket?.close();
      socketRef.current = null;
    };
  }, [eventId, screenKey]);

  useEffect(() => {
    if (!eventId || !screenKey) {
      setReconnecting(false);
      return;
    }
    if (connected || refusedReason === 'UNAUTHORIZED' || refusedReason === 'EVENT_NOT_LIVE') {
      setReconnecting(false);
      return;
    }
    const timer = setTimeout(() => {
      setReconnecting(true);
    }, RECONNECT_OVERLAY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [connected, refusedReason, eventId, screenKey]);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  return {
    connected,
    reconnecting,
    refusedReason,
    eventState,
    roundView,
    roundResult,
    degradeLevel,
    serverNow,
  };
}
