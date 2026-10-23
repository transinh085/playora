'use client';

import { AnswerTile } from '@playora/ui/game/answer-tile';
import { Countdown } from '@playora/ui/game/countdown';
import { GameButton } from '@playora/ui/game/game-button';
import { GameRoot } from '@playora/ui/game/game-root';
import { JoinPanel } from '@playora/ui/game/join-panel';
import { Leaderboard } from '@playora/ui/game/leaderboard';
import { Stage } from '@playora/ui/game/stage';
import { TeamBar } from '@playora/ui/game/team-bar';
import type { BrandKitTheme, Skin } from '@playora/ui/lib/game-theme';
import { skins } from '@playora/ui/lib/game-theme';
import { cn } from '@playora/ui/lib/utils';
import { useState } from 'react';

const SKIN_LABEL: Record<Skin, string> = {
  classic: 'Classic',
  yep: 'YEP Gala',
  tet: 'Tết',
  day: 'Day (booth)',
};

const TEAMS = [
  { team: 'Kinh doanh', score: 1840 },
  { team: 'Marketing', score: 2210 },
  { team: 'Kỹ thuật', score: 1525 },
  { team: 'Vận hành', score: 990 },
];

const TOP = [
  { id: 'a', name: 'Nguyễn Thị Hồng Nhung', score: 412, meta: 'Marketing' },
  { id: 'b', name: 'Trần Quốc Bảo', score: 398, meta: 'Kinh doanh' },
  { id: 'c', name: 'Lê Hoàng Yến', score: 371, meta: 'Marketing' },
  { id: 'd', name: 'Phạm Đức Thắng', score: 356, meta: 'Kỹ thuật' },
  { id: 'e', name: 'Võ Minh Khôi', score: 340, meta: 'Vận hành' },
];

const ANSWERS = ['Vịnh Hạ Long', 'Phong Nha – Kẻ Bàng', 'Phố cổ Hội An', 'Tràng An'];

/** Example brand kit: a bank in red/white, to show the brand layer overriding a skin. */
const SAMPLE_BRAND: BrandKitTheme = { primary: '#e30613', accent: '#ffcc00', radius: 'soft' };

export function GamePreview() {
  const [skin, setSkin] = useState<Skin>('classic');
  const [branded, setBranded] = useState(false);
  const [picked, setPicked] = useState<number | null>(2);
  const brand = branded ? SAMPLE_BRAND : undefined;
  const max = Math.max(...TEAMS.map((t) => t.score));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {skins.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={skin === s}
            onClick={() => setSkin(s)}
            className={cn(
              'h-9 rounded-full border px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              skin === s && 'border-primary bg-primary text-primary-foreground hover:bg-primary',
            )}
          >
            {SKIN_LABEL[s]}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input
            id="brand-kit-toggle"
            type="checkbox"
            checked={branded}
            onChange={(e) => setBranded(e.target.checked)}
            className="size-4 accent-(--primary)"
          />
          Áp brand kit mẫu (đỏ #E30613)
        </label>
      </div>

      <Stage
        fit="container"
        skin={skin}
        brand={brand}
        className="grid grid-cols-[2fr_3fr] gap-[4cqw]"
      >
        <section className="flex min-w-0 flex-col gap-[2.5cqh]">
          <h3 className="font-game text-stage-xl font-bold text-balance">Lắc điện thoại đua</h3>
          <JoinPanel
            className="text-stage-sm"
            url="playora.vn/yep-abc"
            code="4821"
            qr={
              <div className="size-full bg-[repeating-conic-gradient(#000_0_25%,#fff_0_50%)] bg-size-[18%_18%]" />
            }
          />
          <div className="text-stage-hero">
            <Countdown seconds={4} />
          </div>
          <div className="mt-auto grid gap-[2cqh] text-stage-sm">
            {TEAMS.map((t, i) => (
              <TeamBar
                key={t.team}
                name={t.team}
                score={t.score}
                max={max}
                team={i + 1}
                leading={t.score === max}
              />
            ))}
          </div>
        </section>
        <Leaderboard className="content-start text-stage-base" entries={TOP} />
      </Stage>

      <div className="grid gap-6 sm:grid-cols-2">
        <GameRoot
          skin={skin}
          brand={brand}
          className="mx-auto grid min-h-0 w-full max-w-[360px] content-start gap-3 rounded-[2rem] border-8 border-foreground p-5"
        >
          <p className="text-sm text-game-muted">Câu 3/10 · còn 12 giây</p>
          <p className="font-game text-xl font-bold text-balance">
            Di sản nào được UNESCO công nhận đầu tiên?
          </p>
          {ANSWERS.map((a, i) => (
            <AnswerTile
              key={a}
              index={i}
              state={picked === null ? 'idle' : picked === i ? 'selected' : 'muted'}
              onClick={() => setPicked(i)}
            >
              {a}
            </AnswerTile>
          ))}
        </GameRoot>

        <GameRoot
          skin={skin}
          brand={brand}
          className="mx-auto grid min-h-0 w-full max-w-[360px] content-start justify-items-center gap-5 rounded-[2rem] border-8 border-foreground p-5 text-center"
        >
          <p className="text-sm text-game-muted">Đội Marketing · Hạng #2</p>
          <p className="font-game text-6xl font-extrabold tabular-nums">412</p>
          <GameButton size="tap">Chạm!</GameButton>
          <div className="grid w-full gap-3">
            <GameButton>Tham gia</GameButton>
            <GameButton variant="surface">Xem thể lệ</GameButton>
          </div>
        </GameRoot>
      </div>
    </div>
  );
}
