'use client';

import { useLiveRoom } from '@playora/realtime-client/react';
import { useEffect, useState } from 'react';
import { formatCountdown, REALTIME_URL, SPIKE_EVENT } from '@/lib/live';
import type { ScreenView } from '../types';

const OPTIONS = { url: REALTIME_URL, eventId: SPIKE_EVENT, role: 'screen' } as const;

export default function SpikeScreenPage() {
  const { connected, view, serverNow } = useLiveRoom<ScreenView>(OPTIONS);
  const [now, setNow] = useState(Date.now());
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/spike/player`);
    const id = setInterval(() => setNow(serverNow()), 200);
    return () => clearInterval(id);
  }, [serverNow]);

  const maxTeam = Math.max(1, ...(view?.teams.map((t) => t.score) ?? []));

  return (
    <main className="grid min-h-dvh grid-cols-[2fr_3fr] gap-10 bg-[#120326] p-12 text-white">
      <section className="flex flex-col gap-6">
        <h1 className="text-5xl font-extrabold">Lắc điện thoại đua</h1>
        <p className="text-2xl opacity-80">Tham gia tại: {joinUrl}</p>
        <p className="text-xl opacity-60">
          {connected ? `${view?.online ?? 0} người đang chơi` : 'Đang kết nối lại…'}
        </p>
        <p className="text-8xl font-extrabold tabular-nums">
          {view?.status === 'playing'
            ? formatCountdown(view.endsAt, now)
            : view?.status === 'result'
              ? 'KẾT THÚC'
              : 'SẴN SÀNG'}
        </p>
        <div className="mt-auto grid gap-4">
          {view?.teams.map((t) => (
            <div key={t.team}>
              <div className="flex justify-between text-2xl font-semibold">
                <span>{t.team}</span>
                <span className="tabular-nums">{t.score}</span>
              </div>
              <div className="mt-1 h-6 rounded-full bg-white/10">
                <div
                  className="h-6 rounded-full bg-amber-400 transition-[width] duration-100"
                  style={{ width: `${(t.score / maxTeam) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <ol className="flex flex-col gap-3">
        {view?.top.map((r, i) => (
          <li
            key={r.id}
            className="flex items-center gap-6 rounded-2xl bg-white/5 px-6 py-4 text-3xl"
          >
            <span className="w-12 font-extrabold text-amber-400">#{i + 1}</span>
            <span className="flex-1 truncate">{r.name}</span>
            <span className="text-xl opacity-60">{r.team}</span>
            <span className="w-24 text-right font-extrabold tabular-nums">{r.score}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
