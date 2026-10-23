'use client';

import { useLiveRoom } from '@playora/realtime-client/react';
import { GameButton } from '@playora/ui/game/game-button';
import { GameRoot } from '@playora/ui/game/game-root';
import { useEffect, useRef, useState } from 'react';
import { formatCountdown, REALTIME_URL, SPIKE_EVENT } from '@/lib/live';
import { type PlayerView, TEAMS } from '../types';

const SEND_EVERY_MS = 250;
// Hysteresis on |accelerationIncludingGravity| (m/s²): count a shake on the way up, re-arm when calm.
const SHAKE_HIGH = 20;
const SHAKE_LOW = 13;

type MotionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

function playerKey() {
  const stored = localStorage.getItem('playora:spike:key');
  if (stored) return stored;
  const key = crypto.randomUUID();
  localStorage.setItem('playora:spike:key', key);
  return key;
}

export default function SpikePlayerPage() {
  const [name, setName] = useState('');
  const [team, setTeam] = useState(TEAMS[0] as string);
  const [query, setQuery] = useState<Record<string, string> | null>(null);
  const [motion, setMotion] = useState<MotionState>('unknown');
  const [now, setNow] = useState(Date.now());
  const pending = useRef(0);
  const armed = useRef(true);
  const { connected, view, socket, serverNow } = useLiveRoom<PlayerView>(
    query ? { url: REALTIME_URL, eventId: SPIKE_EVENT, role: 'player', query } : null,
  );

  useEffect(() => {
    const id = setInterval(() => {
      setNow(serverNow());
      if (pending.current > 0 && socket.current?.connected) {
        socket.current.emit('input', {
          roundId: SPIKE_EVENT,
          seq: Date.now(),
          data: { d: pending.current },
        });
        pending.current = 0;
      }
    }, SEND_EVERY_MS);
    return () => clearInterval(id);
  }, [socket, serverNow]);

  useEffect(() => {
    if (motion !== 'granted') return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const magnitude = Math.hypot(a.x, a.y, a.z);
      if (armed.current && magnitude > SHAKE_HIGH) {
        armed.current = false;
        pending.current++;
      } else if (magnitude < SHAKE_LOW) {
        armed.current = true;
      }
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [motion]);

  async function join() {
    // iOS only grants motion access from a user gesture, so ask while handling the Join tap.
    const Motion = window.DeviceMotionEvent as unknown as
      | { requestPermission?: () => Promise<'granted' | 'denied'> }
      | undefined;
    if (!Motion) setMotion('unsupported');
    else if (typeof Motion.requestPermission === 'function') {
      setMotion(await Motion.requestPermission().catch(() => 'denied' as const));
    } else setMotion('granted');

    setQuery({ key: playerKey(), name: name || 'Khách', team });
  }

  if (!query) {
    return (
      <GameRoot className="flex flex-col">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 p-6">
          <h1 className="font-game text-2xl font-bold text-balance">Lắc điện thoại đua</h1>
          <input
            className="h-14 rounded-game border border-game-border bg-game-surface px-4 text-lg outline-none placeholder:text-game-muted focus-visible:ring-4 focus-visible:ring-game-fg/40"
            placeholder="Tên của bạn"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="h-14 rounded-game border border-game-border bg-game-surface px-4 text-lg outline-none focus-visible:ring-4 focus-visible:ring-game-fg/40"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          >
            {TEAMS.map((t) => (
              <option key={t} className="text-black">
                {t}
              </option>
            ))}
          </select>
          <GameButton size="lg" className="mt-2" onClick={join}>
            Tham gia
          </GameButton>
        </main>
      </GameRoot>
    );
  }

  const playing = view?.status === 'playing';
  return (
    <GameRoot className="flex flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 p-6 text-center select-none">
        <p className="text-sm text-game-muted">
          {connected ? 'Đã kết nối' : 'Đang kết nối…'} · cảm biến: {motion}
        </p>
        <p className="font-game text-lg font-bold">
          {playing
            ? `Lắc đi! ${formatCountdown(view?.endsAt ?? null, now)}`
            : view?.status === 'result'
              ? 'Hết giờ!'
              : 'Chờ MC bắt đầu…'}
        </p>
        <p
          key={view?.score}
          className="animate-score-pop font-game text-7xl font-extrabold tabular-nums"
        >
          {view?.score ?? 0}
        </p>
        <p className="text-game-muted">
          Hạng #{view?.rank ?? '-'} · Đội {team}: {view?.teamScore ?? 0}
        </p>
        <GameButton
          size="tap"
          disabled={!playing}
          onPointerDown={() => {
            pending.current++;
          }}
        >
          {motion === 'granted' ? 'Lắc / Chạm' : 'Chạm'}
        </GameButton>
      </main>
    </GameRoot>
  );
}
