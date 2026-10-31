'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Switch } from '@playora/ui/components/base/switch/switch';
import { QRCodeSvg } from '@playora/ui/components/foundations/qr-code/qr-code';
import { Countdown } from '@playora/ui/game/countdown';
import { GameButton } from '@playora/ui/game/game-button';
import { GameResult } from '@playora/ui/game/game-result';
import { GameRoot } from '@playora/ui/game/game-root';
import { JoinPanel } from '@playora/ui/game/join-panel';
import { Leaderboard } from '@playora/ui/game/leaderboard';
import { TeamBar } from '@playora/ui/game/team-bar';
import { Gift, ShieldCheck } from '@playora/ui/icons';
import { type BrandKitTheme, type Skin, skins } from '@playora/ui/theme';
import { useState } from 'react';

const SKIN_LABEL: Record<Skin, string> = {
  tet: 'Tết (Đỏ lì xì & Vàng lá)',
  day: 'Day (Quán sáng / Ngoài trời)',
  yep: 'YEP Gala (Navy & Champagne)',
  classic: 'Classic (Sân khấu Tím)',
};

const COMPARE_SKIN: Record<Skin, Skin> = {
  tet: 'day',
  day: 'tet',
  yep: 'tet',
  classic: 'tet',
};

const PRIZE_POOL = [
  { team: 'Mua 1 Tặng 1 Ô Long', score: 38 },
  { team: 'Miễn phí Up Size L', score: 142 },
  { team: 'Topping Kem Phô Mai', score: 96 },
  { team: 'Túi vải Lộc Xuân', score: 36 },
];

const TOP = [
  { id: 'a', name: 'Nguyễn Thị Hồng Nhung', score: 412, meta: 'Cơ sở Nguyễn Huệ' },
  { id: 'b', name: 'Trần Quốc Bảo', score: 398, meta: 'Cơ sở Cầu Giấy' },
  { id: 'c', name: 'Lê Hoàng Yến', score: 371, meta: 'Cơ sở Thảo Điền' },
];

/** Example brand kit: a bubble-tea chain in signature crimson/gold, overriding the base skin. */
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
  const max = Math.max(...PRIZE_POOL.map((t) => t.score));

  return (
    <GameRoot
      skin={skin}
      brand={brand}
      data-testid={`game-preview-skin-${skin}`}
      className="grid min-h-0 w-full content-start gap-5 rounded-3xl border-4 border-foreground/15 p-6 shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <Chip
          variant="caption"
          color="neutral"
          className="m-0 border-0 bg-[var(--game-surface)] px-3 py-1 font-game text-xs font-bold text-[var(--game-fg)]"
        >
          {badgeLabel}: {SKIN_LABEL[skin]}
        </Chip>
        <div className="text-3xl">
          <Countdown seconds={4} />
        </div>
      </div>

      {/* BLD-25: Transparent Cover Prize Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-game border border-game-border bg-game-surface px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <Gift className="size-4" />
          <span>Còn 312 / 400 phần quà tại 3 cơ sở (BLD-25)</span>
        </div>
        <span className="rounded-full bg-black/20 px-2.5 py-0.5 font-mono text-[11px]">
          Hôm nay còn 1 lượt
        </span>
      </div>

      <JoinPanel
        className="rounded-game border border-game-border bg-game-surface p-3 text-sm"
        url="play.playora.vn/tra-sua-ha"
        code="PL94K7"
      />

      <div className="grid gap-2">
        {PRIZE_POOL.map((t, i) => (
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

      <Leaderboard highlightId="b" entries={TOP} className="text-sm" />

      <GameResult
        outcome="win"
        title="Chúc mừng! Bạn trúng 1× Up Size L"
        description="Đưa mã PL94K7 cho nhân viên quầy trước 05/02/2027"
      />

      {/* PRZ-03 / PRZ-16: Voucher Card with QR + Anti-screenshot live indicator */}
      <div className="flex items-center justify-between gap-3 rounded-game border border-game-border bg-game-surface p-3.5">
        <div className="rounded-xl bg-white p-1.5">
          <QRCodeSvg value="PL94K7" size={56} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-lg font-extrabold tracking-widest">PL94K7</div>
          <div className="flex items-center gap-1.5 text-[11px] text-game-muted">
            <ShieldCheck className="size-3.5 shrink-0" />
            <span>Đồng hồ thực chống ảnh chụp màn hình · 17:09:24</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-1">
        <GameButton size="tap">Quay ngay!</GameButton>
        <div className="grid w-full gap-2.5 sm:grid-cols-3">
          <GameButton variant="primary" size="md">
            Lưu vào Zalo
          </GameButton>
          <GameButton variant="accent" size="md">
            Quà của tôi
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
  const [skin, setSkin] = useState<Skin>('tet');
  const [branded, setBranded] = useState(false);
  const brand = branded ? SAMPLE_BRAND : undefined;
  const secondarySkin = COMPARE_SKIN[skin];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex flex-wrap rounded-xl bg-muted p-1 text-xs">
          {skins.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSkin(s)}
              className={`rounded-lg px-3.5 py-1.5 font-medium transition-all ${
                skin === s
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {SKIN_LABEL[s]}
            </button>
          ))}
        </div>
        <Switch isSelected={branded} onChange={setBranded}>
          Áp Brand Kit quán mẫu (Đỏ #E30613 · Tương phản tự động WCAG)
        </Switch>
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
            <p className="text-xs text-game-muted">Vòng quay Lộc Xuân · Còn 1 lượt hôm nay</p>
            <GameButton variant="primary" size="md" className="w-full">
              Quay ngay
            </GameButton>
          </GameRoot>
        ))}
      </div>
    </div>
  );
}
