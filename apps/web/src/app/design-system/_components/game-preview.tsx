'use client';

import { Badge } from '@playora/ui/components/badge';
import { Switch } from '@playora/ui/components/switch';
import { Countdown } from '@playora/ui/game/countdown';
import { GameButton } from '@playora/ui/game/game-button';
import { GameResult } from '@playora/ui/game/game-result';
import { GameRoot } from '@playora/ui/game/game-root';
import { JoinPanel } from '@playora/ui/game/join-panel';
import { Leaderboard } from '@playora/ui/game/leaderboard';
import { TeamBar } from '@playora/ui/game/team-bar';
import { type BrandKitTheme, type Skin, skins } from '@playora/ui/theme';
import { useState } from 'react';

const SKIN_LABEL: Record<Skin, string> = {
  classic: 'Classic',
  yep: 'YEP Gala',
  tet: 'Tết',
  day: 'Day (booth)',
};

const COMPARE_SKIN: Record<Skin, Skin> = {
  classic: 'tet',
  yep: 'day',
  tet: 'yep',
  day: 'classic',
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

/** Example brand kit: a bank in red/gold, to show the brand layer overriding a skin. */
const SAMPLE_BRAND: BrandKitTheme = { primary: '#e30613', accent: '#ffcc00', radius: 'soft' };

function SkinShowcaseCard({
  skin,
  brand,
  badgeLabel,
}: {
  skin: Skin;
  brand?: BrandKitTheme;
  badgeLabel: string;
}) {
  const max = Math.max(...TEAMS.map((t) => t.score));

  return (
    <GameRoot
      skin={skin}
      brand={brand}
      data-testid={`game-preview-skin-${skin}`}
      className="grid min-h-0 w-full content-start gap-5 rounded-3xl border-4 border-foreground/15 p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="secondary"
          className="m-0 border-0 px-3 py-1 font-game text-xs font-bold bg-[var(--game-surface)] text-[var(--game-fg)]"
        >
          {badgeLabel}: {SKIN_LABEL[skin]}
        </Badge>
        <div className="text-3xl">
          <Countdown seconds={4} />
        </div>
      </div>

      <JoinPanel
        className="rounded-game border border-game-border bg-game-surface p-3 text-sm"
        url="playora.vn/yep-abc"
        code="4821"
      />

      <div className="grid gap-2">
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

      <Leaderboard highlightId="b" entries={TOP.slice(0, 3)} className="text-sm" />

      <GameResult
        outcome="win"
        title="Chúc mừng! Bạn trúng Giải Nhất"
        description="Ô vòng quay: Lộc Xuân"
      />

      <div className="flex flex-col items-center gap-3 pt-1">
        <GameButton size="tap">Chạm!</GameButton>
        <div className="grid w-full gap-2.5 sm:grid-cols-3">
          <GameButton variant="primary" size="md">
            Quay ngay
          </GameButton>
          <GameButton variant="accent" size="md">
            Nhận quà
          </GameButton>
          <GameButton variant="surface" size="md">
            Thể lệ
          </GameButton>
        </div>
      </div>
    </GameRoot>
  );
}

export function GamePreview() {
  const [skin, setSkin] = useState<Skin>('classic');
  const [branded, setBranded] = useState(false);
  const brand = branded ? SAMPLE_BRAND : undefined;
  const secondarySkin = COMPARE_SKIN[skin];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full bg-muted p-1 text-xs">
          {skins.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSkin(s)}
              className={`rounded-full px-3 py-1 font-medium transition-all ${
                skin === s
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {SKIN_LABEL[s]}
            </button>
          ))}
        </div>
        <label
          htmlFor="brand-kit-toggle"
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <Switch
            id="brand-kit-toggle"
            checked={branded}
            onCheckedChange={(checked) => setBranded(checked)}
          />
          <span>Áp brand kit mẫu (đỏ #E30613)</span>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SkinShowcaseCard skin={skin} brand={brand} badgeLabel="Skin đang chọn" />
        <SkinShowcaseCard skin={secondarySkin} brand={brand} badgeLabel="So sánh skin" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {skins.map((s) => (
          <GameRoot
            key={s}
            skin={s}
            brand={brand}
            className="grid min-h-0 content-start gap-3 rounded-2xl border border-foreground/15 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-game text-sm font-bold">{SKIN_LABEL[s]}</span>
              <Countdown seconds={s === 'tet' ? 3 : 12} className="text-lg" />
            </div>
            <p className="text-xs text-game-muted">Vòng quay may mắn · 3 lượt còn lại</p>
            <GameButton variant="primary" size="md" className="w-full">
              Quay ngay
            </GameButton>
          </GameRoot>
        ))}
      </div>
    </div>
  );
}
