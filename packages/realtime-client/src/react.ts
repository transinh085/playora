'use client';

import {
  type CommandAck,
  type EventState,
  type HostCommand,
  LiveConnectError,
  LiveInput,
  type RoundResultPayload,
} from '@playora/contracts';
import { type ClockSync, createClockSync } from '@playora/game-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { connectLive, type LiveConnectOptions, type LiveSocket, syncClock } from './index';

export type LiveConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'refused';

export interface LiveRoomState<V = unknown, A = unknown> {
  status: LiveConnectionStatus;
  connected: boolean;
  refusedReason: LiveConnectError | null;
  eventState: EventState | null;
  view: V | null;
  result: RoundResultPayload | null;
  /** Server-aligned clock for countdowns. */
  serverNow: () => number;
  /** Sends a player input for the current round (accepts either raw action `A` or full `LiveInput`). */
  send: (input: A | LiveInput) => void;
  /** Sends a host command and awaits the server acknowledgement. */
  command: (cmd: HostCommand) => Promise<CommandAck>;
  socket: React.RefObject<LiveSocket | null>;
}

/** One socket per mounted component; reconnects automatically, resumes state, and syncs clock. */
export function useLiveRoom<V = unknown, A = unknown>(
  options: LiveConnectOptions | null,
): LiveRoomState<V, A> {
  const [status, setStatus] = useState<LiveConnectionStatus>('connecting');
  const [refusedReason, setRefusedReason] = useState<LiveConnectError | null>(null);
  const [eventState, setEventState] = useState<EventState | null>(null);
  const [view, setView] = useState<V | null>(null);
  const [result, setResult] = useState<RoundResultPayload | null>(null);

  const socket = useRef<LiveSocket | null>(null);
  const clockRef = useRef<ClockSync>(createClockSync());
  const eventStateRef = useRef<EventState | null>(null);
  const roundIdRef = useRef<string | null>(null);
  const inputSeqRef = useRef(0);

  const key = options
    ? JSON.stringify({
        url: options.url,
        eventId: options.eventId,
        role: options.role,
        auth: options.auth,
      })
    : null;

  useEffect(() => {
    if (!key) return;
    const parsed = JSON.parse(key) as Omit<LiveConnectOptions, 'onSnapshot'>;
    setStatus('connecting');
    setRefusedReason(null);
    clockRef.current.reset();

    const s = connectLive({
      ...parsed,
      onSnapshot: (snapshot) => {
        eventStateRef.current = snapshot.state;
        roundIdRef.current = snapshot.state.round?.id ?? null;
        setEventState(snapshot.state);
        if (snapshot.view) {
          roundIdRef.current = snapshot.view.roundId;
          setView(snapshot.view.view as V);
        }
      },
    });
    socket.current = s;

    s.on('connect', () => {
      setStatus('connected');
      setRefusedReason(null);
      syncClock(s, 5, clockRef.current).catch(() => {});
    });

    s.on('disconnect', () => {
      setStatus((prev) => (prev === 'refused' ? 'refused' : 'reconnecting'));
    });

    s.io.on('reconnect_attempt', () => {
      setStatus((prev) => (prev === 'refused' ? 'refused' : 'reconnecting'));
    });

    s.on('connect_error', (err: Error) => {
      const parsedErr = LiveConnectError.safeParse(err.message);
      if (parsedErr.success) {
        setRefusedReason(parsedErr.data);
        setStatus('refused');
        s.close();
      } else {
        setStatus((prev) => (prev === 'refused' ? 'refused' : 'reconnecting'));
      }
    });

    s.on('event.state', (nextState) => {
      eventStateRef.current = nextState;
      roundIdRef.current = nextState.round?.id ?? null;
      setEventState(nextState);
      if (nextState.round?.status === 'lobby' || nextState.round?.status === 'countdown') {
        setResult(null);
      }
    });

    s.on('round.view', (payload) => {
      roundIdRef.current = payload.roundId;
      setView(payload.view as V);
    });

    s.on('round.result', (payload) => {
      setResult(payload);
    });

    return () => {
      s.close();
      socket.current = null;
    };
  }, [key]);

  const serverNow = useCallback(() => clockRef.current.now(), []);

  const send = useCallback((input: A | LiveInput) => {
    const s = socket.current;
    if (!s) return;
    const parsedEnvelope = LiveInput.safeParse(input);
    if (parsedEnvelope.success) {
      s.emit('input', parsedEnvelope.data);
      return;
    }
    const roundId = eventStateRef.current?.round?.id ?? roundIdRef.current;
    if (!roundId) return;
    inputSeqRef.current += 1;
    s.emit('input', {
      roundId,
      seq: inputSeqRef.current,
      data: input,
    });
  }, []);

  const command = useCallback(async (cmd: HostCommand): Promise<CommandAck> => {
    const s = socket.current;
    if (!s) return { ok: false, error: 'DISCONNECTED' };
    return s.emitWithAck('host.command', cmd);
  }, []);

  return {
    status,
    connected: status === 'connected',
    refusedReason,
    eventState,
    view,
    result,
    serverNow,
    send,
    command,
    socket,
  };
}
