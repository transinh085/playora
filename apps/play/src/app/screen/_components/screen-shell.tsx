'use client';

import type { ScreenQrPosition, ScreenQrSize, ScreenSession } from '@playora/contracts';
import { JoinPanel } from '@playora/ui/game/join-panel';
import { Stage } from '@playora/ui/game/stage';
import type { BrandKitTheme } from '@playora/ui/lib/game-theme';
import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeAspectFit, consumeScreenKeyFromWindow } from '../_lib/aspect-fit';
import { useScreenLive } from '../_lib/live';
import { GameStage } from './game-stage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const CURSOR_IDLE_MS = 3_000;

const QR_POSITION_CLASSES: Record<Exclude<ScreenQrPosition, 'hidden'>, string> = {
  'top-left': 'top-[4cqh] left-[4cqw]',
  'top-right': 'top-[4cqh] right-[4cqw]',
  'bottom-left': 'bottom-[4cqh] left-[4cqw]',
  'bottom-right': 'bottom-[4cqh] right-[4cqw]',
};

const QR_SIZE_TEXT_CLASSES: Record<ScreenQrSize, string> = {
  sm: 'text-stage-xs',
  md: 'text-stage-sm',
  lg: 'text-stage-base',
};

type LoadState =
  | { status: 'loading' }
  | { status: 'revoked' }
  | { status: 'error'; message: string }
  | { status: 'ready'; screenKey: string; session: ScreenSession };

export function ScreenShell() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [qrSvg, setQrSvg] = useState<string>('');
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });
  const [cursorHidden, setCursorHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Read key from fragment (#k=<key>), save to sessionStorage, strip fragment, load session
  useEffect(() => {
    const key = consumeScreenKeyFromWindow();
    if (!key) {
      setLoadState({ status: 'revoked' });
      return;
    }

    let cancelled = false;
    fetch(`${API_URL.replace(/\/$/, '')}/v1/screen/session`, {
      headers: { 'x-screen-key': key },
      cache: 'no-store',
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setLoadState({ status: 'revoked' });
          return;
        }
        if (!res.ok) {
          setLoadState({ status: 'error', message: `API ${res.status}` });
          return;
        }
        const session = (await res.json()) as ScreenSession;
        if (!cancelled) {
          setLoadState({ status: 'ready', screenKey: key, session });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState({ status: 'error', message: 'Không thể kết nối máy chủ' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Track real viewport dimensions for aspect-fit letterboxing
  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // 3. Auto-hide cursor after 3 seconds of inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setCursorHidden(true);
    }, CURSOR_IDLE_MS);

    function handleActivity() {
      setCursorHidden(false);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setCursorHidden(true);
      }, CURSOR_IDLE_MS);
    }

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('mousedown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  // 4. Track fullscreen state
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // 5. Screen Wake Lock where supported
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    async function requestWakeLock() {
      if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (active) {
          sentinel = lock;
        } else {
          await lock.release().catch(() => {});
        }
      } catch {
        // Ignored when unsupported or denied in headless browser environments
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    }

    void requestWakeLock();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release().catch(() => {});
    };
  }, []);

  const readySession = loadState.status === 'ready' ? loadState.session : null;
  const readyKey = loadState.status === 'ready' ? loadState.screenKey : '';

  // 6. Generate QR SVG for joinUrl
  useEffect(() => {
    if (!readySession?.joinUrl) return;
    let mounted = true;
    QRCode.toString(readySession.joinUrl, { type: 'svg', margin: 1 })
      .then((svg) => {
        if (mounted) setQrSvg(svg);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [readySession?.joinUrl]);

  // 7. Connect to realtime via _lib/live adapter
  const live = useScreenLive(
    readySession
      ? {
          eventId: readySession.event.id,
          screenKey: readyKey,
          enabled: true,
        }
      : null,
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignored if blocked by browser policy
    }
  }, []);

  const brandTheme = useMemo<BrandKitTheme | undefined>(() => {
    const kit = readySession?.brandKit;
    if (!kit) return undefined;
    return {
      primary: kit.colors.primary,
      accent: kit.colors.secondary,
      background: kit.colors.background,
      text: kit.colors.text,
      fontDisplay: kit.fontHeading,
    };
  }, [readySession?.brandKit]);

  if (loadState.status === 'revoked' || live.refusedReason === 'UNAUTHORIZED') {
    return (
      <main
        data-testid="screen-revoked"
        className="game-backdrop fixed inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center font-sans"
      >
        <h1 className="font-game text-3xl font-bold">Màn hình đã bị thu hồi</h1>
        <p className="text-game-muted max-w-md text-base">
          Khoá màn hình này không hợp lệ, đã được đổi mới hoặc đã bị thu hồi trong Studio.
        </p>
      </main>
    );
  }

  if (loadState.status === 'loading') {
    return (
      <main
        data-testid="screen-loading"
        className="game-backdrop fixed inset-0 flex items-center justify-center font-sans"
      >
        <p className="text-game-muted text-lg">Đang tải màn hình sự kiện…</p>
      </main>
    );
  }

  if (loadState.status === 'error') {
    return (
      <main
        data-testid="screen-error"
        className="game-backdrop fixed inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center font-sans"
      >
        <h1 className="font-game text-2xl font-bold">Không thể tải màn hình</h1>
        <p className="text-game-muted text-sm">{loadState.message}</p>
      </main>
    );
  }

  const { session } = loadState;
  const fit = computeAspectFit(viewport, session.layout);
  const onlineCount = live.eventState?.onlineCount ?? 0;
  const shortJoinUrl = session.joinUrl.replace(/^https?:\/\//, '');
  const safeAreaPct = session.layout.safeAreaPct;
  const qrPos = session.layout.qrPosition;
  const qrSize = session.layout.qrSize;

  return (
    <div
      data-testid="screen-viewport"
      data-cursor-hidden={cursorHidden || undefined}
      className={cursorHidden ? 'cursor-none' : undefined}
    >
      <Stage
        brand={brandTheme}
        ratio={fit.ratio}
        fit="viewport"
        data-testid="screen-stage"
        data-aspect={session.layout.aspect}
        style={
          session.brandKit?.fontBody
            ? ({ fontFamily: session.brandKit.fontBody } as React.CSSProperties)
            : undefined
        }
        className="relative flex flex-col justify-between p-0!"
      >
        {session.brandKit?.backgroundUrl && (
          <div
            aria-hidden="true"
            data-testid="screen-brand-background"
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: `url("${session.brandKit.backgroundUrl}")` }}
          />
        )}

        <div
          data-testid="screen-safe-area"
          style={{
            padding: `${safeAreaPct}cqh ${safeAreaPct}cqw`,
          }}
          className="relative z-10 flex h-full w-full flex-col justify-between"
        >
          <header className="flex items-start justify-between gap-[3cqw]">
            <div className="flex min-w-0 items-center gap-[1.8cqw]">
              {session.brandKit?.logoUrl && (
                // biome-ignore lint/performance/noImgElement: Presigned brand logo URL from S3
                <img
                  src={session.brandKit.logoUrl}
                  alt={session.brandKit.name}
                  data-testid="screen-brand-logo"
                  className="h-[6cqh] w-auto object-contain"
                />
              )}
              {session.layout.showEventTitle && (
                <h1
                  data-testid="screen-event-title"
                  className="font-game truncate text-stage-xl font-extrabold"
                >
                  {session.event.name}
                </h1>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-[1.2cqw]">
              <div
                data-testid="screen-online-count"
                className="flex items-center gap-[0.6cqw] rounded-full border border-game-border bg-game-surface px-[1.5cqw] py-[0.6cqh] font-game text-stage-sm font-bold tabular-nums"
              >
                <span className="size-[1cqh] rounded-full bg-game-primary" />
                <span>{onlineCount} người tham gia</span>
              </div>

              {!cursorHidden && (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  data-testid="fullscreen-button"
                  aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                  className="rounded-full border border-game-border bg-game-surface px-[1.2cqw] py-[0.6cqh] text-stage-xs font-semibold transition-opacity hover:opacity-80"
                >
                  {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
                </button>
              )}
            </div>
          </header>

          <GameStage
            eventStatus={session.event.status}
            eventState={live.eventState}
            roundView={live.roundView}
            roundResult={live.roundResult}
            serverNow={live.serverNow}
          />

          <footer className="flex items-end justify-between text-stage-xs text-game-muted">
            <span>{session.screen.name}</span>
          </footer>
        </div>

        {qrPos !== 'hidden' && (
          <div
            data-testid="screen-qr-panel"
            data-qr-position={qrPos}
            data-qr-size={qrSize}
            className={`absolute z-20 rounded-game border border-game-border bg-game-surface/90 p-[1.2cqh] backdrop-blur-xs ${QR_POSITION_CLASSES[qrPos]} ${QR_SIZE_TEXT_CLASSES[qrSize]}`}
          >
            <JoinPanel
              url={shortJoinUrl}
              qr={
                qrSvg ? (
                  <div
                    data-testid="screen-join-qr"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted SVG generated locally by `qrcode`
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : undefined
              }
            />
          </div>
        )}

        {live.reconnecting && (
          <div
            role="status"
            aria-live="polite"
            data-testid="screen-reconnecting"
            className="absolute top-[2cqh] left-1/2 z-30 -translate-x-1/2 rounded-full border border-game-border bg-black/80 px-[2cqw] py-[0.8cqh] text-stage-sm font-semibold text-white shadow-lg backdrop-blur-xs"
          >
            Đang kết nối lại…
          </div>
        )}
      </Stage>
    </div>
  );
}
