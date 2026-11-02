'use client';

import type { LocalizedText, PlayerProps } from '@playora/game-sdk';
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  type Texture,
} from 'pixi.js';
import { useEffect, useRef, useState } from 'react';
import type { CatchItemsConfig, CatchItemsSubmission } from './definition';

function pickText(text: LocalizedText | undefined, locale: 'vi' | 'en', fallback: string): string {
  if (!text) return fallback;
  if (locale === 'en' && text.en && text.en.trim().length > 0) {
    return text.en;
  }
  return text.vi || fallback;
}

interface FallingItem {
  id: number;
  type: 'positive' | 'negative';
  display: Container;
  x: number;
  y: number;
  speed: number;
}

interface FloatingScore {
  id: number;
  text: Text;
  y: number;
  alpha: number;
}

export function CatchItemsPlayer({
  config,
  brand,
  assets,
  locale,
  session,
  onFinished,
}: PlayerProps<CatchItemsConfig, undefined, CatchItemsSubmission>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.durationSeconds ?? 15);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetScore = config.targetScore ?? 50;
  const durationSeconds = config.durationSeconds ?? 15;
  const itemSpeed = config.itemSpeed ?? 4.5;
  const spawnIntervalMs = config.spawnIntervalMs ?? 550;

  // Refs for access inside Pixi ticker loop without stale closures
  const stateRef = useRef({
    score: 0,
    itemsCaught: 0,
    bombsHit: 0,
    elapsedMs: 0,
    isPlaying: false,
    catcherX: 187.5,
  });

  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const isReady = session.state === 'ready';
  const isPlaying = session.state === 'playing';

  // Synchronize playing flag
  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
    if (isReady) {
      stateRef.current.score = 0;
      stateRef.current.itemsCaught = 0;
      stateRef.current.bombsHit = 0;
      stateRef.current.elapsedMs = 0;
      setScore(0);
      setTimeLeft(durationSeconds);
      setCountdown(null);
    }
  }, [isPlaying, isReady, durationSeconds]);

  const handleStartGame = () => {
    if (!isReady || countdown !== null) return;
    setCountdown(3);
    setTimeout(() => setCountdown(2), 400);
    setTimeout(() => setCountdown(1), 800);
    setTimeout(() => {
      setCountdown(0); // GO!
      setTimeout(() => {
        setCountdown(null);
        void session.start();
      }, 300);
    }, 1200);
  };

  // PixiJS Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isCancelled = false;
    let app: Application | null = null;
    let removeListeners: (() => void) | null = null;

    const items: FallingItem[] = [];
    const floatingTexts: FloatingScore[] = [];
    let nextItemId = 1;
    let nextFloatId = 1;
    let lastSpawnTime = 0;

    const primaryColorHex =
      Number.parseInt(brand.colors.primary.replace('#', '0x'), 16) || 0xf59e0b;
    const accentColorHex =
      Number.parseInt(
        (brand.colors.accent ?? brand.colors.secondary ?? '#ef4444').replace('#', '0x'),
        16,
      ) || 0xef4444;

    const initPixi = async () => {
      const instance = new Application();
      await instance.init({
        resizeTo: container,
        backgroundAlpha: 0,
        resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        autoDensity: true,
      });

      if (isCancelled) {
        instance.destroy(true, { children: true, texture: true, context: true });
        return;
      }

      app = instance;
      container.appendChild(instance.canvas);

      // Root game layer with 375x600 logical bounds
      const layer = new Container();
      instance.stage.addChild(layer);

      // Scale and center logic
      const updateLayout = () => {
        if (!instance) return;
        const scale = Math.min(instance.screen.width / 375, instance.screen.height / 600);
        layer.scale.set(scale);
        layer.x = (instance.screen.width - 375 * scale) / 2;
        layer.y = (instance.screen.height - 600 * scale) / 2;
      };
      updateLayout();
      instance.renderer.on('resize', updateLayout);

      // Background decorative frame if no image asset
      const bgGraphics = new Graphics();
      bgGraphics.roundRect(0, 0, 375, 600, 16).stroke({ width: 2, color: 0xffffff, alpha: 0.1 });
      layer.addChild(bgGraphics);

      // Items container
      const itemGroup = new Container();
      layer.addChild(itemGroup);

      // Float container for +10/-10 floating text
      const floatGroup = new Container();
      layer.addChild(floatGroup);

      // Catcher container
      const catcherGroup = new Container();
      catcherGroup.x = 187.5;
      catcherGroup.y = 540;
      layer.addChild(catcherGroup);

      // Try loading catcher texture, fallback to vector basket
      const catcherUrl = assets.url('player_catcher');
      let catcherSpriteLoaded = false;
      if (catcherUrl) {
        try {
          const texture = await Assets.load(catcherUrl);
          if (!isCancelled && texture) {
            const spr = new Sprite(texture);
            spr.anchor.set(0.5);
            spr.width = 80;
            spr.height = 80;
            catcherGroup.addChild(spr);
            catcherSpriteLoaded = true;
          }
        } catch {
          // fallback to vector
        }
      }

      if (!catcherSpriteLoaded && !isCancelled) {
        const basket = new Graphics();
        // Basket body
        basket.roundRect(-40, -15, 80, 30, 10).fill(primaryColorHex);
        // Basket rim
        basket.roundRect(-45, -20, 90, 8, 4).fill(accentColorHex);
        catcherGroup.addChild(basket);
      }

      // Preload item textures if available
      const posUrl = assets.url('item_positive');
      const negUrl = assets.url('item_negative');
      let posTexture: Texture | null = null;
      let negTexture: Texture | null = null;

      if (posUrl) {
        try {
          posTexture = await Assets.load(posUrl);
        } catch {
          // fallback
        }
      }
      if (negUrl) {
        try {
          negTexture = await Assets.load(negUrl);
        } catch {
          // fallback
        }
      }

      // Pointer drag interaction
      const handlePointer = (clientX: number) => {
        if (!stateRef.current.isPlaying) return;
        if (!container || !layer?.scale || isCancelled) return;
        const rect = container.getBoundingClientRect();
        const scale = layer.scale.x || 1;
        const localX = (clientX - rect.left - layer.x) / scale;
        const clampedX = Math.max(45, Math.min(330, localX));
        stateRef.current.catcherX = clampedX;
        if (catcherGroup) {
          catcherGroup.x = clampedX;
        }
      };

      const onPointerDown = (e: PointerEvent) => {
        if (!stateRef.current.isPlaying) return;
        handlePointer(e.clientX);
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!stateRef.current.isPlaying) return;
        if (e.buttons > 0 || e.pointerType === 'touch') {
          handlePointer(e.clientX);
        }
      };

      container.addEventListener('pointerdown', onPointerDown);
      container.addEventListener('pointermove', onPointerMove);

      removeListeners = () => {
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
      };

      // Game Loop
      instance.ticker.add((ticker) => {
        if (!stateRef.current.isPlaying) return;

        const dt = ticker.deltaMS;
        stateRef.current.elapsedMs += dt;
        const elapsedSec = stateRef.current.elapsedMs / 1000;
        const remaining = Math.max(0, Math.ceil(durationSeconds - elapsedSec));
        setTimeLeft(remaining);

        // Check time up
        if (remaining <= 0) {
          stateRef.current.isPlaying = false;
          setIsSubmitting(true);
          session
            .submit({
              score: stateRef.current.score,
              durationMs: Math.round(stateRef.current.elapsedMs),
              itemsCaught: stateRef.current.itemsCaught,
              bombsHit: stateRef.current.bombsHit,
            })
            .finally(() => {
              setIsSubmitting(false);
            });
          return;
        }

        // Spawn items
        if (stateRef.current.elapsedMs - lastSpawnTime > spawnIntervalMs) {
          lastSpawnTime = stateRef.current.elapsedMs;
          const isPos = Math.random() < 0.75;
          const itemX = 35 + Math.random() * (375 - 70);

          const itemNode = new Container();
          itemNode.x = itemX;
          itemNode.y = -20;

          if (isPos) {
            if (posTexture) {
              const spr = new Sprite(posTexture);
              spr.anchor.set(0.5);
              spr.width = 44;
              spr.height = 44;
              itemNode.addChild(spr);
            } else {
              const cup = new Graphics();
              cup.roundRect(-15, -20, 30, 40, 6).fill(accentColorHex);
              cup.roundRect(-18, -24, 36, 6, 3).fill(primaryColorHex);
              cup.rect(2, -32, 4, 10).fill(0xffffff);
              itemNode.addChild(cup);
            }
          } else {
            if (negTexture) {
              const spr = new Sprite(negTexture);
              spr.anchor.set(0.5);
              spr.width = 44;
              spr.height = 44;
              itemNode.addChild(spr);
            } else {
              const bomb = new Graphics();
              bomb.circle(0, 0, 16).fill(0x27272a);
              bomb.rect(-2, -22, 4, 8).fill(0xd97706);
              bomb.circle(0, -23, 3).fill(0xef4444);
              itemNode.addChild(bomb);
            }
          }

          itemGroup.addChild(itemNode);
          items.push({
            id: nextItemId++,
            type: isPos ? 'positive' : 'negative',
            display: itemNode,
            x: itemX,
            y: -20,
            speed: (itemSpeed + (Math.random() * 2 - 1)) * (dt / 16.66) * 1.8,
          });
        }

        // Move and collide items
        const catcherX = stateRef.current.catcherX;
        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];
          if (!item) continue;
          item.y += item.speed;
          item.display.y = item.y;

          // Collision with catcher at Y ~ 530..555
          if (item.y >= 520 && item.y <= 555 && Math.abs(item.x - catcherX) < 45) {
            if (item.type === 'positive') {
              stateRef.current.score += 10;
              stateRef.current.itemsCaught += 1;
              setScore(stateRef.current.score);

              // Floating score
              const flText = new Text({
                text: '+10',
                style: new TextStyle({
                  fontFamily: 'sans-serif',
                  fontSize: 20,
                  fontWeight: 'bold',
                  fill: '#10b981',
                }),
              });
              flText.x = item.x;
              flText.y = item.y - 10;
              floatGroup.addChild(flText);
              floatingTexts.push({ id: nextFloatId++, text: flText, y: item.y - 10, alpha: 1 });
            } else {
              stateRef.current.score = Math.max(0, stateRef.current.score - 10);
              stateRef.current.bombsHit += 1;
              setScore(stateRef.current.score);

              const flText = new Text({
                text: '-10',
                style: new TextStyle({
                  fontFamily: 'sans-serif',
                  fontSize: 20,
                  fontWeight: 'bold',
                  fill: '#ef4444',
                }),
              });
              flText.x = item.x;
              flText.y = item.y - 10;
              floatGroup.addChild(flText);
              floatingTexts.push({ id: nextFloatId++, text: flText, y: item.y - 10, alpha: 1 });
            }

            itemGroup.removeChild(item.display);
            item.display.destroy({ children: true });
            items.splice(i, 1);
            continue;
          }

          // Fall off screen
          if (item.y > 610) {
            itemGroup.removeChild(item.display);
            item.display.destroy({ children: true });
            items.splice(i, 1);
          }
        }

        // Update floating texts
        for (let j = floatingTexts.length - 1; j >= 0; j--) {
          const fl = floatingTexts[j];
          if (!fl) continue;
          fl.y -= 1.5;
          fl.alpha -= 0.03;
          fl.text.y = fl.y;
          fl.text.alpha = fl.alpha;
          if (fl.alpha <= 0) {
            floatGroup.removeChild(fl.text);
            fl.text.destroy();
            floatingTexts.splice(j, 1);
          }
        }
      });
    };

    initPixi();

    return () => {
      isCancelled = true;
      if (removeListeners) {
        removeListeners();
      }
      if (app) {
        app.destroy(true, { children: true, texture: true, context: true });
      }
    };
  }, [brand, assets, itemSpeed, spawnIntervalMs, durationSeconds, session]);

  const isDone = session.state === 'done';
  const outcome = session.result?.outcome;
  const isWin = outcome?.kind === 'win';

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl select-none"
      style={{
        touchAction: 'none',
      }}
      data-testid="catch-items-player"
    >
      {/* Top HUD when playing */}
      {isPlaying && (
        <div className="pointer-events-none absolute top-3 left-3 right-3 z-10 flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-black/55 px-4 py-2.5 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <span className="text-sm">⏱️</span>
              <span className="font-mono text-base tracking-wider">{timeLeft}s</span>
            </div>
            <div className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/90">
              Mục tiêu: <span className="font-bold text-amber-300">{targetScore}đ</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="text-sm">⭐</span>
              <span className="font-mono text-base tracking-wider">{score}đ</span>
            </div>
          </div>
          {/* Visual Score Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-200"
              style={{ width: `${Math.min(100, Math.round((score / targetScore) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* 3.. 2.. 1.. Countdown Overlay */}
      {countdown !== null && (
        <div className="animate-in fade-in zoom-in-75 absolute inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-xs duration-200">
          <span className="font-mono text-7xl font-black text-amber-400 drop-shadow-[0_4px_24px_rgba(251,191,36,0.6)]">
            {countdown === 0 ? 'GO!' : countdown}
          </span>
        </div>
      )}

      {/* Ready State - Clean Floating Start Card */}
      {isReady && countdown === null && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center">
          <div className="flex flex-col items-center gap-3.5 rounded-3xl border border-white/20 bg-black/60 p-6 backdrop-blur-md shadow-2xl max-w-[290px] w-full">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/20 text-3xl shadow-inner border border-amber-400/30">
              🧋
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-black text-white tracking-tight">
                {pickText(config.copy?.title, locale, 'Hứng Trà Sữa')}
              </h2>
              <p className="text-xs leading-relaxed text-white/80">
                {pickText(
                  config.copy?.instruction,
                  locale,
                  'Kéo ly hứng trà sữa (+10đ) và tránh chạm bom (-10đ)',
                )}
              </p>
            </div>
            <div className="rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-300 border border-amber-400/30">
              🎯 Mục tiêu: {targetScore}đ / {durationSeconds}s
            </div>
            <button
              type="button"
              onClick={handleStartGame}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/30 transition-all hover:brightness-105 active:scale-95 cursor-pointer"
              data-testid="catch-items-start-button"
            >
              <span className="text-sm font-extrabold tracking-wide uppercase">
                {pickText(config.copy?.cta, locale, 'Bắt đầu')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Done State - Fluid Auto-transition to Campaign Result Screen */}
      {isDone && (
        <div className="animate-in fade-in zoom-in-95 pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md bg-black/60 duration-300">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/20 bg-black/75 p-6 text-white shadow-2xl backdrop-blur-md max-w-[280px]">
            <div className="text-4xl animate-bounce">{isWin ? '🎉' : '⭐'}</div>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-black text-amber-400">
                {isWin ? 'XUẤT SẮC!' : 'HẾT GIỜ!'}
              </h3>
              <p className="text-xs text-white/90">
                Bạn đạt <span className="font-bold text-amber-300">{score} điểm</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-white/70">
              <span className="size-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <span>Đang chuyển sang mở quà...</span>
            </div>
          </div>
        </div>
      )}

      {/* Submitting Loading Indicator */}
      {isSubmitting && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="size-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          <div className="mt-3 text-xs font-semibold text-white/90">
            Hết giờ! Đang tổng kết điểm...
          </div>
        </div>
      )}
    </div>
  );
}
