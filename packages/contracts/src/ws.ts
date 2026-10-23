import { z } from 'zod';

/** Who is on the other end of a socket. Decides which rooms it joins and which views it receives. */
export const SocketRole = z.enum(['player', 'screen', 'host']);
export type SocketRole = z.infer<typeof SocketRole>;

export const RoundStatus = z.enum(['idle', 'lobby', 'countdown', 'playing', 'result', 'closed']);
export type RoundStatus = z.infer<typeof RoundStatus>;

export const HostCommand = z.discriminatedUnion('cmd', [
  z.object({ cmd: z.literal('round.open'), gameId: z.string().min(1) }),
  z.object({ cmd: z.literal('round.start') }),
  z.object({ cmd: z.literal('round.pause') }),
  z.object({ cmd: z.literal('round.end') }),
  z.object({ cmd: z.literal('round.next') }),
  z.object({
    cmd: z.literal('draw.spin'),
    prizeId: z.string().min(1),
    count: z.number().int().min(1).max(50),
  }),
  z.object({ cmd: z.literal('draw.void'), spinId: z.string().min(1), reason: z.string().min(3) }),
]);
export type HostCommand = z.infer<typeof HostCommand>;

/** Generic live input; each template narrows `data` with its own `inputSchema`. */
export const LiveInput = z.object({
  roundId: z.string().min(1),
  seq: z.number().int().nonnegative(),
  data: z.unknown(),
});
export type LiveInput = z.infer<typeof LiveInput>;

export interface EventState {
  eventId: string;
  activeGameId: string | null;
  round: { id: string; status: RoundStatus; endsAt?: number } | null;
  onlineCount: number;
}

export interface RoundView<V = unknown> {
  seq: number;
  roundId: string;
  view: V;
}

export interface CommandAck {
  ok: boolean;
  error?: string;
}

export interface ServerToClientEvents {
  'event.state': (state: EventState) => void;
  'round.view': (view: RoundView) => void;
  'system.degrade': (payload: { level: 0 | 1 | 2 }) => void;
}

export interface ClientToServerEvents {
  'clock.ping': (payload: { t0: number }, ack: (res: { t0: number; ts: number }) => void) => void;
  'host.command': (command: HostCommand, ack: (res: CommandAck) => void) => void;
  input: (input: LiveInput) => void;
}
