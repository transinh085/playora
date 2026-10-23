'use client';

import { useLiveRoom } from '@playora/realtime-client/react';
import { Countdown } from '@playora/ui/game/countdown';
import { JoinPanel } from '@playora/ui/game/join-panel';
import { Leaderboard } from '@playora/ui/game/leaderboard';
import { Stage } from '@playora/ui/game/stage';
import { TeamBar } from '@playora/ui/game/team-bar';
import { useEffect, useState } from 'react';
import { REALTIME_URL, SPIKE_EVENT } from '@/lib/live';
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
    <Stage className="grid grid-cols-[2fr_3fr] gap-[4cqw]">
      <section className="flex min-w-0 flex-col gap-[2.5cqh]">
        <h1 className="font-display text-stage-xl font-bold text-balance">Lắc điện thoại đua</h1>
        <JoinPanel url={joinUrl.replace(/^https?:\/\//, '')} className="text-stage-sm" />
        <p className="text-stage-sm text-game-muted">
          {connected ? `${view?.online ?? 0} người đang chơi` : 'Đang kết nối lại…'}
        </p>
        <div className="text-stage-hero">
          {view?.status === 'playing' && view.endsAt ? (
            <Countdown seconds={(view.endsAt - now) / 1000} />
          ) : (
            <span className="font-display text-stage-2xl font-extrabold">
              {view?.status === 'result' ? 'Kết thúc' : 'Sẵn sàng'}
            </span>
          )}
        </div>
        <div className="mt-auto grid gap-[2cqh] text-stage-base">
          {view?.teams.map((t, i) => (
            <TeamBar
              key={t.team}
              name={t.team}
              score={t.score}
              max={maxTeam}
              team={i + 1}
              leading={t.score > 0 && t.score === maxTeam}
            />
          ))}
        </div>
      </section>
      <Leaderboard
        className="content-start text-stage-lg"
        entries={(view?.top ?? []).map((r) => ({ ...r, meta: r.team }))}
      />
    </Stage>
  );
}
