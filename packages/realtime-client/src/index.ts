import type { ClientToServerEvents, ServerToClientEvents, SocketRole } from '@playora/contracts';
import { io, type Socket } from 'socket.io-client';
import { type ClockSample, estimateOffset } from './clock';

export * from './clock';

export type LiveSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface LiveConnectOptions {
  /** Realtime origin, e.g. http://localhost:4001 */
  url: string;
  eventId: string;
  role: SocketRole;
  /** Extra handshake query (spike: key/name/team). */
  query?: Record<string, string>;
  /** Handshake auth: player token, screen key or host ticket. */
  auth?: Record<string, string>;
}

export function connectLive({ url, eventId, role, query, auth }: LiveConnectOptions): LiveSocket {
  return io(`${url.replace(/\/$/, '')}/live`, {
    query: { ...query, event: eventId, role },
    auth,
    // WebSocket only: long-polling fallbacks multiply load at 5k players.
    transports: ['websocket'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    randomizationFactor: 0.5,
  });
}

/** Pings the server a few times and returns the clock offset to add to Date.now(). */
export async function syncClock(socket: LiveSocket, samples = 5): Promise<number> {
  const results: ClockSample[] = [];
  for (let i = 0; i < samples; i++) {
    const t0 = Date.now();
    const { ts } = await socket.timeout(2_000).emitWithAck('clock.ping', { t0 });
    results.push({ t0, ts, t1: Date.now() });
  }
  return estimateOffset(results);
}
