'use client';

import {
  type BrandKit,
  createPreviewSession,
  type Locale,
  type PlayOutcome,
  PREVIEW_READY_TYPE,
  PreviewMessage,
  type PreviewMessagePayload,
  type PreviewOutcomePreset,
  PreviewReadyMessage,
  resolveSkinConfig,
  resolveTemplateAssets,
  toPlayOutcome,
} from '@playora/game-sdk';
import { getTemplate, getTemplateSurfaces } from '@playora/templates';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

const DEFAULT_BRAND: BrandKit = {
  colors: {
    primary: '#F59E0B',
    secondary: '#EF4444',
    accent: '#F59E0B',
    background: '#0F172A',
    text: '#F8FAFC',
  },
};

export type { PreviewMessagePayload, PreviewOutcomePreset };

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
  const templateId = searchParams.get('template') ?? 'spin-wheel';
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
  const [outcomePreset, setOutcomePreset] = useState<PreviewOutcomePreset | PlayOutcome>('win');
  const [assetMap, setAssetMap] = useState<Record<string, string>>({});
  const [, setSessionTick] = useState(0);

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

      const parsed = PreviewMessage.safeParse(event.data);
      if (!parsed.success) return;
      const data = parsed.data;

      if (data.config) {
        setConfigOverride(data.config);
      }
      if (typeof data.skinKey === 'string') {
        setSkinKey(data.skinKey);
      } else if (typeof data.skin === 'string') {
        setSkinKey(data.skin);
      }
      if (data.brand) {
        setBrand((prev) => ({
          ...prev,
          ...data.brand,
          colors: {
            ...prev.colors,
            ...(data.brand?.colors ?? {}),
          },
        }));
      }
      if (data.locale) {
        setLocale(data.locale);
      }
      if (data.outcome) {
        setOutcomePreset(data.outcome);
      }
      const incomingAssets = data.assets ?? data.assetUrls;
      if (incomingAssets) {
        setAssetMap(incomingAssets);
      }
    };

    window.addEventListener('message', handleMessage);
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(PreviewReadyMessage.parse({ type: PREVIEW_READY_TYPE }), '*');
    }
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const activeSkinKey = skinKey ?? template?.skins[0]?.key ?? 'chung';

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

  const resolvedOutcome = useMemo(() => toPlayOutcome(outcomePreset), [outcomePreset]);

  const session = useMemo(() => {
    if (!template) return null;
    return createPreviewSession({
      template,
      config: resolvedConfig,
      outcome: resolvedOutcome,
      onChange: () => {
        setSessionTick((n) => n + 1);
      },
    });
  }, [template, resolvedConfig, resolvedOutcome]);

  if (!template || !templateSurfaces || !session) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-background p-6 text-muted-foreground"
        data-testid="preview-not-found"
      >
        Không tìm thấy mẫu trò chơi: {templateId}
      </div>
    );
  }

  const PlayerComponent = templateSurfaces.Player;
  if (!PlayerComponent) {
    return null;
  }

  return (
    <div className="min-h-dvh w-full" data-testid="preview-surface-player">
      <Suspense
        fallback={
          <div className="flex min-h-dvh flex-col items-center justify-center p-6">
            <Skeleton className="h-48 w-full max-w-sm rounded-xl" />
          </div>
        }
      >
        <PlayerComponent
          config={resolvedConfig}
          brand={brand}
          assets={assets}
          skin={activeSkinKey}
          locale={locale}
          quality="high"
          session={session}
          onFinished={() => {}}
        />
      </Suspense>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
          Đang tải bản xem trước…
        </div>
      }
    >
      <PreviewSurface />
    </Suspense>
  );
}
