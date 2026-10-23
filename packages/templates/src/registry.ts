import {
  TAP_RACE_MAX_DELTA_PER_INPUT,
  TAP_RACE_MIN_INPUT_INTERVAL_MS,
  TAP_RACE_TOP_N,
  type TapRaceAction,
  type TapRaceConfig,
  type TapRacePlayerView,
  type TapRaceRacer,
  type TapRaceScreenView,
  type TapRaceState,
  tapRaceActionSchema,
  tapRaceConfigSchema,
  tapRaceServer,
} from '@playora/game-sdk/examples/tap-race';
import {
  defineTemplate,
  type LiveServerModule,
  type TemplateDefinition,
} from '@playora/game-sdk/server';
import type { z } from 'zod';

export {
  TAP_RACE_MAX_DELTA_PER_INPUT,
  TAP_RACE_MIN_INPUT_INTERVAL_MS,
  TAP_RACE_TOP_N,
  type TapRaceAction,
  type TapRaceConfig,
  type TapRacePlayerView,
  type TapRaceRacer,
  type TapRaceScreenView,
  type TapRaceState,
  tapRaceActionSchema,
  tapRaceConfigSchema,
  tapRaceServer,
};

export const tapRaceTemplate = defineTemplate({
  id: 'tap-race',
  version: '1.0.0',
  kind: 'live',
  name: { vi: 'Đua chạm tốc độ', en: 'Tap Race' },
  description: {
    vi: 'Người chơi chạm liên tục trên điện thoại để đưa đội mình về đích trên màn hình LED.',
    en: 'Players tap rapidly on their phones to race their team to the finish line on the big screen.',
  },
  thumbnail: '/templates/tap-race/thumb.png',
  tags: ['yep', 'tet', 'team', 'live'],
  configSchema: tapRaceConfigSchema,
  assetSlots: [
    {
      key: 'runner',
      label: { vi: 'Nhân vật đua', en: 'Runner sprite' },
      required: true,
      ratio: '1:1',
      minPx: 256,
      transparent: true,
      accept: ['image'],
    },
    {
      key: 'background',
      label: { vi: 'Ảnh nền đường đua', en: 'Track background' },
      required: true,
      ratio: '16:9',
      minPx: 1280,
      accept: ['image'],
    },
    {
      key: 'sponsorLogo',
      label: { vi: 'Logo thương hiệu', en: 'Brand logo' },
      required: false,
      brandable: true,
      transparent: true,
      accept: ['image'],
    },
    {
      key: 'bgm',
      label: { vi: 'Nhạc nền', en: 'Background music' },
      required: false,
      accept: ['audio'],
    },
  ],
  skins: [
    {
      key: 'yep',
      name: { vi: 'YEP Sang Trọng', en: 'YEP Gala' },
      tags: ['yep'],
      assets: {
        runner: '/skins/yep/runner.png',
        background: '/skins/yep/track-bg.png',
      },
      config: {
        trackColor: '#F59E0B',
      },
    },
    {
      key: 'tet',
      name: { vi: 'Tết Đinh Mùi', en: 'Lunar New Year' },
      tags: ['tet'],
      assets: {
        runner: '/skins/tet/horse.png',
        background: '/skins/tet/festival-bg.png',
      },
      config: {
        trackColor: '#EF4444',
      },
    },
  ],
  hotEditable: ['copy.title', 'copy.cta'],
  server: tapRaceServer,
});

// biome-ignore lint/suspicious/noExplicitAny: Heterogeneous template registry
export type RegisteredTemplate = TemplateDefinition<z.ZodType<any>, any, any, any, any>;
export type RegisteredServerTemplate = RegisteredTemplate;

// biome-ignore lint/suspicious/noExplicitAny: Heterogeneous server module map
export type AnyLiveServerModule = LiveServerModule<any, any, any, any, any>;

export const templates: readonly RegisteredTemplate[] = Object.freeze([tapRaceTemplate]);

export function getTemplate(id: string, version?: string): RegisteredTemplate | undefined {
  return templates.find((t) => t.id === id && (version === undefined || t.version === version));
}

export const serverModules: Readonly<Record<string, AnyLiveServerModule>> = Object.freeze(
  Object.fromEntries(
    templates.flatMap((tpl) => {
      if (!tpl.server || typeof tpl.server === 'function') return [];
      return [
        [tpl.id, tpl.server],
        [`${tpl.id}@${tpl.version}`, tpl.server],
      ];
    }),
  ),
);

export function getServerModule(id: string, version?: string): AnyLiveServerModule | undefined {
  if (version !== undefined) {
    return serverModules[`${id}@${version}`];
  }
  return serverModules[id];
}
