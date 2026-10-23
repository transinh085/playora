'use client';

import type {
  EventState,
  EventStatus,
  RoundResultPayload,
  RoundStatus,
  RoundView,
} from '@playora/contracts';
import { Countdown } from '@playora/ui/game/countdown';
import { Leaderboard } from '@playora/ui/game/leaderboard';
import { useEffect, useState } from 'react';

const ROUND_STATUS_LABELS: Record<RoundStatus, string> = {
  idle: 'Sẵn sàng bắt đầu',
  lobby: 'Phòng chờ đang mở',
  countdown: 'Chuẩn bị bắt đầu',
  playing: 'Vòng chơi đang diễn ra',
  result: 'Kết quả vòng chơi',
  closed: 'Đã kết thúc vòng chơi',
};

const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Bản nháp · Sẵn sàng kiểm thử',
  scheduled: 'Đã lên lịch',
  live: 'Đang diễn ra trực tiếp',
  ended: 'Sự kiện đã kết thúc',
  archived: 'Đã lưu trữ',
};

export interface GameStageProps {
  eventStatus: EventStatus;
  eventState: EventState | null;
  roundView: RoundView | null;
  roundResult: RoundResultPayload | null;
  serverNow: () => number;
}

/**
 * Slot component where the active game's Screen surface renders.
 * Until template Screen surfaces are mounted, shows the round status, countdown, and round result from `event.state`.
 */
export function GameStage({ eventStatus, eventState, roundResult, serverNow }: GameStageProps) {
  const [now, setNow] = useState(() => Date.now());
  const round = eventState?.round ?? null;
  const roundStatus: RoundStatus = round?.status ?? 'idle';
  const endsAt = round?.endsAt ?? null;

  useEffect(() => {
    if (!endsAt) return;
    setNow(serverNow());
    const id = setInterval(() => {
      setNow(serverNow());
    }, 200);
    return () => clearInterval(id);
  }, [endsAt, serverNow]);

  const remainingSeconds = endsAt ? Math.max(0, (endsAt - now) / 1000) : null;

  return (
    <section
      data-slot="game-stage"
      data-testid="game-stage"
      data-round-status={roundStatus}
      className="flex flex-1 flex-col items-center justify-center gap-[2.5cqh] text-center"
    >
      <div className="inline-flex items-center gap-[0.8cqw] rounded-full border border-game-border bg-game-surface px-[1.6cqw] py-[0.6cqh] text-stage-sm text-game-muted">
        <span className="size-[0.9cqh] rounded-full bg-game-primary" />
        <span data-testid="screen-round-status">{ROUND_STATUS_LABELS[roundStatus]}</span>
        <span>·</span>
        <span>{EVENT_STATUS_LABELS[eventStatus]}</span>
      </div>

      {remainingSeconds !== null && (roundStatus === 'countdown' || roundStatus === 'playing') ? (
        <div className="text-stage-hero" data-testid="screen-countdown">
          <Countdown seconds={remainingSeconds} />
        </div>
      ) : (
        <p className="font-game text-stage-xl font-bold text-balance">
          {roundStatus === 'idle' || roundStatus === 'lobby'
            ? 'Quét mã QR trên màn hình để tham gia ngay!'
            : ROUND_STATUS_LABELS[roundStatus]}
        </p>
      )}

      {roundStatus === 'result' && roundResult && roundResult.ranking.length > 0 && (
        <div className="w-full max-w-[60cqw] text-left">
          <Leaderboard
            className="text-stage-lg"
            entries={roundResult.ranking.slice(0, 5).map((item) => ({
              id: item.playerId,
              name: item.displayName,
              score: item.score,
              meta: item.team,
            }))}
          />
        </div>
      )}
    </section>
  );
}
