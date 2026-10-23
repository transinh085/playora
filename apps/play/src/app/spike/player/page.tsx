'use client';

import { Button } from '@playora/ui';
import { useEffect, useRef, useState } from 'react';
import { formatCountdown, SPIKE_EVENT, useLiveSocket } from '@/lib/live';
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
  const { connected, view, socket } = useLiveSocket<PlayerView>(query);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
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
  }, [socket]);

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

    setQuery({ event: SPIKE_EVENT, role: 'player', key: playerKey(), name: name || 'Khách', team });
  }

  if (!query) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-2xl font-extrabold">Lắc điện thoại đua</h1>
        <input
          className="h-12 rounded-lg border border-border bg-surface px-3"
          placeholder="Tên của bạn"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="h-12 rounded-lg border border-border bg-surface px-3"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        >
          {TEAMS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Button className="h-12 text-base" onClick={join}>
          Tham gia
        </Button>
      </main>
    );
  }

  const playing = view?.status === 'playing';
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center select-none">
      <p className="text-sm opacity-60">
        {connected ? 'Đã kết nối' : 'Đang kết nối…'} · cảm biến: {motion}
      </p>
      <p className="text-lg font-semibold">
        {playing
          ? `Lắc đi! ${formatCountdown(view?.endsAt ?? null, now)}`
          : view?.status === 'result'
            ? 'Hết giờ!'
            : 'Chờ MC bắt đầu…'}
      </p>
      <p className="text-7xl font-extrabold tabular-nums">{view?.score ?? 0}</p>
      <p className="opacity-70">
        Hạng #{view?.rank ?? '-'} · Đội {team}: {view?.teamScore ?? 0}
      </p>
      <button
        type="button"
        disabled={!playing}
        onPointerDown={() => {
          pending.current++;
        }}
        className="size-44 rounded-full bg-brand text-xl font-extrabold text-brand-foreground shadow-lg active:scale-95 disabled:opacity-40"
      >
        {motion === 'granted' ? 'LẮC hoặc CHẠM' : 'CHẠM'}
      </button>
    </main>
  );
}
