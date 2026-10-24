import type {
  ClientToServerEvents,
  LiveHandshakeAuth,
  LiveSnapshot,
  ServerToClientEvents,
  SocketRole,
} from '@playora/contracts';
import {
  type ClockSample,
  type ClockSync,
  type ClockSyncOptions,
  createClockSync,
  estimateClockOffset,
  isValidClockSample,
  sampleOffset,
  sampleRtt,
} from '@playora/game-sdk';
import { io, type Socket } from 'socket.io-client';

export {
  type ClockSample,
  type ClockSync,
  type ClockSyncOptions,
  createClockSync,
  estimateClockOffset,
  estimateClockOffset as estimateOffset,
  isValidClockSample,
  sampleOffset,
  sampleRtt,
};

export type LiveSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface LiveConnectOptions {
  /** Realtime origin, e.g. http://localhost:4001 */
  url: string;
  eventId: string;
  role: SocketRole;
  /** Handshake auth: player token / host ticket (`{ token }`) or screen key (`{ screenKey }`). */
  auth: LiveHandshakeAuth;
  /** Invoked when automatic `session.resume` returns a snapshot. */
  onSnapshot?: (snapshot: LiveSnapshot) => void;
}

export function connectLive({
  url,
  eventId,
  role,
  auth,
  onSnapshot,
}: LiveConnectOptions): LiveSocket {
  const socket: LiveSocket = io(`${url.replace(/\/$/, '')}/live`, {
    query: { event: eventId, role },
    auth,
    // WebSocket only: long-polling fallbacks multiply load at 5k players.
    transports: ['websocket'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    randomizationFactor: 0.5,
  });

  let lastSeq = 0;

  socket.on('round.view', (payload) => {
    if (typeof payload?.seq === 'number' && payload.seq > lastSeq) {
      lastSeq = payload.seq;
    }
  });

  socket.on('connect', () => {
    socket.emit('session.resume', { lastSeq }, (res) => {
      if (!res?.snapshot) return;
      if (res.snapshot.view && res.snapshot.view.seq > lastSeq) {
        lastSeq = res.snapshot.view.seq;
      }
      onSnapshot?.(res.snapshot);
    });
  });

  socket.on('connect_error', () => {
    if (socket.connected) {
      queueMicrotask(() => {
        if (socket.connected) {
          socket.close();
        }
      });
    }
  });

  return socket;
}

/** Pings the server a few times and returns the clock offset to add to Date.now(). */
export async function syncClock(
  socket: LiveSocket,
  samples = 5,
  clock?: ClockSync,
): Promise<number> {
  const results: ClockSample[] = [];
  for (let i = 0; i < samples; i++) {
    const t0 = Date.now();
    const { ts } = await socket.timeout(2_000).emitWithAck('clock.ping', { t0 });
    const sample: ClockSample = { t0, ts, t1: Date.now() };
    results.push(sample);
    clock?.recordSample(sample);
  }
  return clock ? clock.offsetMs : estimateClockOffset(results);
}
