/**
 * Spike S0-3 — N simulated players in one shake race (docs/05-architecture.md §13).
 *
 *   bun run loadtest:shake --n 5000 --duration 60
 *
 * Pass criteria: p95 broadcast latency < 150 ms, ≥ 99% connected, server event-loop lag < 50 ms.
 * One process tops out around a few thousand sockets; for 5k+ run several with distinct --prefix
 * (and raise `ulimit -n` on both client and server machines).
 */
import { parseArgs } from 'node:util';
import { io, type Socket } from 'socket.io-client';

const { values: args } = parseArgs({
  options: {
    url: {
      type: 'string',
      default: process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:4001',
    },
    event: { type: 'string', default: 'spike' },
    n: { type: 'string', default: '1000' },
    duration: { type: 'string', default: '30' },
    ramp: { type: 'string', default: '10' },
    prefix: { type: 'string', default: 'bot' },
    'host-key': { type: 'string', default: process.env.REALTIME_HOST_KEY ?? 'dev-host-key' },
    'no-host': { type: 'boolean', default: false },
  },
});

const N = Number(args.n);
const DURATION_S = Number(args.duration);
const RAMP_S = Number(args.ramp);
const TEAMS = ['Kinh doanh', 'Marketing', 'Kỹ thuật', 'Vận hành'];
const endpoint = `${args.url}/live`;

const latencies: number[] = [];
let connected = 0;
let failed = 0;
let disconnected = 0;
let closing = false;
const sockets: Socket[] = [];

function connect(query: Record<string, string>, auth: Record<string, string> = {}) {
  return io(endpoint, {
    query,
    auth,
    transports: ['websocket'],
    reconnection: true,
    timeout: 20_000,
  });
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return Number.NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] as number;
}

function onView(payload: { view?: { serverTs?: number } }) {
  const ts = payload.view?.serverTs;
  if (typeof ts === 'number') latencies.push(Date.now() - ts);
}

async function serverHealth() {
  try {
    const res = await fetch(`${args.url}/health`);
    return (await res.json()) as Record<string, number>;
  } catch {
    return undefined;
  }
}

// Screen client: measures what the LED would see.
const screen = connect({ event: args.event, role: 'screen' });
screen.on('round.view', onView);

console.log(`→ ramping ${N} players over ${RAMP_S}s to ${endpoint} (event "${args.event}")`);
const perTick = Math.max(1, Math.ceil(N / (RAMP_S * 10)));
for (let i = 0; i < N; i += perTick) {
  for (let j = i; j < Math.min(N, i + perTick); j++) {
    const s = connect({
      event: args.event,
      role: 'player',
      key: `${args.prefix}-${j}`,
      name: `${args.prefix} ${j}`,
      team: TEAMS[j % TEAMS.length] as string,
    });
    s.on('connect', () => connected++);
    s.on('connect_error', () => failed++);
    s.on('disconnect', () => {
      if (!closing) disconnected++;
    });
    s.on('round.view', onView);
    sockets.push(s);
  }
  await Bun.sleep(100);
}
await Bun.sleep(2_000);
console.log(`✓ connected ${connected}/${N} (connect errors: ${failed})`);

if (!args['no-host']) {
  const host = connect({ event: args.event, role: 'host' }, { hostKey: args['host-key'] });
  await new Promise<void>((resolve) => host.on('connect', () => resolve()));
  await host.emitWithAck('host.command', { cmd: 'round.next' });
  const ack = await host.emitWithAck('host.command', { cmd: 'round.start' });
  console.log(`✓ round.start ack: ${JSON.stringify(ack)}`);
}

// Every player shakes: one input per 250 ms, like the real client.
let seq = 0;
const shaking = setInterval(() => {
  seq++;
  for (const s of sockets) {
    if (s.connected) {
      s.emit('input', { roundId: args.event, seq, data: { d: 1 + Math.floor(Math.random() * 6) } });
    }
  }
}, 250);

const startedAt = Date.now();
while (Date.now() - startedAt < DURATION_S * 1000) {
  await Bun.sleep(5_000);
  const window = latencies.splice(0).sort((a, b) => a - b);
  const health = await serverHealth();
  console.log(
    `[${Math.round((Date.now() - startedAt) / 1000)}s] online=${sockets.filter((s) => s.connected).length}` +
      ` views=${window.length} p50=${percentile(window, 50)}ms p95=${percentile(window, 95)}ms` +
      ` p99=${percentile(window, 99)}ms | server lag=${health?.eventLoopLagMs}ms rss=${health?.rssMb}MB` +
      ` inputs/5s=${health?.inputs}`,
  );
}

clearInterval(shaking);
closing = true;
for (const s of sockets) s.close();
screen.close();
console.log(`done — disconnects during run: ${disconnected}`);
process.exit(0);
