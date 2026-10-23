'use client';

import {
  type BrandKit,
  type Locale,
  type PlayerRef,
  resolveSkinConfig,
  resolveTemplateAssets,
} from '@playora/game-sdk';
import { createTestRoom } from '@playora/game-sdk/server';
import { getTemplate, getTemplateSurfaces } from '@playora/templates';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_BRAND: BrandKit = {
  colors: {
    primary: '#F59E0B',
    secondary: '#EF4444',
    accent: '#F59E0B',
    background: '#0F172A',
    text: '#F8FAFC',
  },
};

const PREVIEW_PLAYER: PlayerRef = {
  playerId: 'preview-player',
  displayName: 'Bạn',
  team: 'Đội Đỏ',
};

export interface PreviewMessagePayload {
  type?: string;
  config?: Record<string, unknown>;
  skin?: string;
  skinKey?: string;
  brand?: Partial<BrandKit>;
  locale?: Locale;
  surface?: 'player' | 'screen';
  assets?: Record<string, string>;
  assetUrls?: Record<string, string>;
}

export function isAllowedStudioOrigin(
  origin: string,
  envOrigins = process.env.NEXT_PUBLIC_STUDIO_ORIGINS,
): boolean {
  const raw = envOrigins ?? 'http://localhost:3001';
  const allowed = new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return allowed.has(origin);
}

function PreviewSurface() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template') ?? 'tap-race';
  const querySurface = searchParams.get('surface') === 'screen' ? 'screen' : 'player';
  const querySkin = searchParams.get('skin') ?? undefined;
  const queryLocale: Locale = searchParams.get('locale') === 'en' ? 'en' : 'vi';

  const template = useMemo(() => getTemplate(templateId), [templateId]);
  const templateSurfaces = useMemo(
    () => (template ? getTemplateSurfaces(template.id, template.version) : undefined),
    [template],
  );

  const [configOverride, setConfigOverride] = useState<Record<string, unknown> | undefined>(
    undefined,
  );
  const [skinKey, setSkinKey] = useState<string | undefined>(querySkin);
  const [brand, setBrand] = useState<BrandKit>(DEFAULT_BRAND);
  const [locale, setLocale] = useState<Locale>(queryLocale);
  const [surfaceOverride, setSurfaceOverride] = useState<{
    forQuery: 'player' | 'screen';
    value: 'player' | 'screen';
  } | null>(null);
  const [assetMap, setAssetMap] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);

  const userActionsRef = useRef<unknown[]>([]);
  const querySurfaceRef = useRef<'player' | 'screen'>(querySurface);
  querySurfaceRef.current = querySurface;

  useEffect(() => {
    if (querySkin) {
      setSkinKey(querySkin);
    }
  }, [querySkin]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedStudioOrigin(event.origin, process.env.NEXT_PUBLIC_STUDIO_ORIGINS)) {
        return;
      }

      const data = event.data as PreviewMessagePayload | null;
      if (!data || typeof data !== 'object') return;

      const isKnownMessage =
        data.type === 'playora:preview-update' ||
        data.type === 'preview:update' ||
        'config' in data ||
        'skin' in data ||
        'skinKey' in data ||
        'brand' in data;

      if (!isKnownMessage) return;

      if (data.config && typeof data.config === 'object') {
        setConfigOverride(data.config);
      }
      if (typeof data.skinKey === 'string') {
        setSkinKey(data.skinKey);
      } else if (typeof data.skin === 'string') {
        setSkinKey(data.skin);
      }
      if (data.brand && typeof data.brand === 'object') {
        setBrand((prev) => ({
          ...prev,
          ...data.brand,
          colors: {
            ...prev.colors,
            ...(data.brand?.colors ?? {}),
          },
        }));
      }
      if (data.locale === 'vi' || data.locale === 'en') {
        setLocale(data.locale);
      }
      if (data.surface === 'player' || data.surface === 'screen') {
        setSurfaceOverride({ forQuery: querySurfaceRef.current, value: data.surface });
      }
      const incomingAssets = data.assets ?? data.assetUrls;
      if (incomingAssets && typeof incomingAssets === 'object') {
        setAssetMap(incomingAssets);
      }
    };

    window.addEventListener('message', handleMessage);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'playora:preview-ready' }, '*');
    }
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const activeSkinKey = skinKey ?? template?.skins[0]?.key ?? 'yep';
  const activeSurface =
    surfaceOverride?.forQuery === querySurface ? surfaceOverride.value : querySurface;

  const resolvedConfig = useMemo(() => {
    if (!template) return {};
    try {
      return resolveSkinConfig(template, activeSkinKey, configOverride);
    } catch {
      const activeSkin = template.skins.find((s) => s.key === activeSkinKey) ?? template.skins[0];
      return {
        ...(typeof template.defaultConfig === 'object' && template.defaultConfig !== null
          ? template.defaultConfig
          : {}),
        ...(activeSkin?.config ?? {}),
        ...(configOverride ?? {}),
      };
    }
  }, [template, activeSkinKey, configOverride]);

  const assets = useMemo(() => {
    if (!template) {
      return { all: {}, url: () => undefined };
    }
    const cfgRecord =
      typeof resolvedConfig === 'object' && resolvedConfig !== null
        ? (resolvedConfig as Record<string, unknown>)
        : {};
    return resolveTemplateAssets(template, {
      skinKey: activeSkinKey,
      brand,
      config: cfgRecord,
      assets: assetMap,
    });
  }, [template, activeSkinKey, brand, resolvedConfig, assetMap]);

  // Build and drive the local fake room via game-sdk createTestRoom
  const roomSnapshot = useMemo(() => {
    // revision triggers recomputation when user taps
    void revision;
    if (!template) return null;

    const room = createTestRoom(template, resolvedConfig, { now: 1_000 });
    room.join(PREVIEW_PLAYER);
    room.join({ playerId: 'bot-1', displayName: 'Minh Anh', team: 'Đội Xanh' });
    room.join({ playerId: 'bot-2', displayName: 'Quốc Bảo', team: 'Đội Đỏ' });
    room.join({ playerId: 'bot-3', displayName: 'Thu Hà', team: 'Đội Xanh' });

    room.command({ cmd: 'round.start' });
    room.command({ cmd: 'countdown.elapsed' });

    // Seed baseline bot scores so leaderboard and team bars are visible immediately
    room.advanceTime(300);
    room.action('bot-1', { d: 6 });
    room.advanceTime(300);
    room.action('bot-2', { d: 4 });
    room.advanceTime(300);
    room.action('bot-3', { d: 3 });

    const minInterval = Math.max(
      50,
      Number((room.config as Record<string, unknown>)?.minInputIntervalMs ?? 250),
    );

    for (const act of userActionsRef.current) {
      room.advanceTime(minInterval);
      room.action(PREVIEW_PLAYER, act);
    }

    const nowVal = room.now();
    return {
      status: room.status,
      playerView: room.playerView(PREVIEW_PLAYER),
      screenView: room.screenView(),
      clock: {
        now: () => nowVal,
        offsetMs: 0,
      },
    };
  }, [template, resolvedConfig, revision]);

  const handleSend = useCallback((action: unknown) => {
    userActionsRef.current.push(action);
    setRevision((r) => r + 1);
  }, []);

  if (!template || !templateSurfaces || !roomSnapshot) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-slate-300"
        data-testid="preview-not-found"
      >
        Không tìm thấy mẫu trò chơi: {templateId}
      </div>
    );
  }

  const PlayerComponent = templateSurfaces.Player;
  const ScreenComponent = templateSurfaces.Screen;

  if (activeSurface === 'screen') {
    if (!ScreenComponent) {
      return null;
    }
    return (
      <div className="h-dvh w-full overflow-hidden" data-testid="preview-surface-screen">
        <ScreenComponent
          config={resolvedConfig}
          brand={brand}
          assets={assets}
          skin={activeSkinKey}
          status={roomSnapshot.status}
          state={roomSnapshot.screenView}
          clock={roomSnapshot.clock}
          locale={locale}
          quality="high"
        />
      </div>
    );
  }

  if (!PlayerComponent) {
    return null;
  }

  return (
    <div className="min-h-dvh w-full" data-testid="preview-surface-player">
      <PlayerComponent
        config={resolvedConfig}
        brand={brand}
        assets={assets}
        skin={activeSkinKey}
        status={roomSnapshot.status}
        state={roomSnapshot.playerView}
        clock={roomSnapshot.clock}
        locale={locale}
        quality="high"
        player={PREVIEW_PLAYER}
        send={handleSend}
      />
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-400">
          Đang tải bản xem trước…
        </div>
      }
    >
      <PreviewSurface />
    </Suspense>
  );
}
