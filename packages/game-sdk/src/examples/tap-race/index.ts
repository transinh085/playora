import type { RoundStatus } from '@playora/contracts';
import { z } from 'zod';
import { defineTemplate } from '../../define';
import { field, fieldRegistry } from '../../fields';
import type {
  HostPanelProps,
  LiveServerModule,
  PlayerProps,
  PlayerRef,
  RoomContext,
  RoundResult,
  ScreenProps,
} from '../../types';

export const TAP_RACE_MAX_DELTA_PER_INPUT = 8;
export const TAP_RACE_MIN_INPUT_INTERVAL_MS = 200;
export const TAP_RACE_TOP_N = 10;

export const tapRaceActionSchema = z.object({
  d: z.number().int().min(0).max(64),
});
export type TapRaceAction = z.infer<typeof tapRaceActionSchema>;

export const tapRaceConfigSchema = z.object({
  durationSec: field.slider({
    min: 10,
    max: 180,
    step: 5,
    int: true,
    default: 60,
    group: 'gameplay',
    label: { vi: 'Thời gian đua (giây)', en: 'Race duration (seconds)' },
  }),
  maxDeltaPerInput: field.slider({
    min: 1,
    max: 32,
    step: 1,
    int: true,
    default: TAP_RACE_MAX_DELTA_PER_INPUT,
    group: 'gameplay',
    label: { vi: 'Điểm tối đa mỗi lần gửi', en: 'Max delta per input' },
  }),
  minInputIntervalMs: field.number({
    min: 50,
    max: 1_000,
    int: true,
    default: TAP_RACE_MIN_INPUT_INTERVAL_MS,
    group: 'gameplay',
    label: { vi: 'Khoảng cách tối thiểu giữa 2 lần gửi (ms)', en: 'Min input interval (ms)' },
  }),
  topN: field.slider({
    min: 3,
    max: 50,
    step: 1,
    int: true,
    default: TAP_RACE_TOP_N,
    group: 'gameplay',
    label: { vi: 'Số người hiển thị trên bảng xếp hạng', en: 'Top N leaderboard' },
  }),
  mode: field.segmented(['team', 'solo'] as const, {
    default: 'team',
    group: 'gameplay',
    label: { vi: 'Chế độ thi đấu', en: 'Race mode' },
    optionLabels: {
      team: { vi: 'Theo đội', en: 'Team' },
      solo: { vi: 'Cá nhân', en: 'Solo' },
    },
  }),
  trackColor: field.color({
    default: '#F59E0B',
    group: 'appearance',
    label: { vi: 'Màu đường đua', en: 'Track color' },
  }),
  runnerSprite: field.asset('runner', {
    default: '/assets/tap-race/horse.png',
    group: 'appearance',
    label: { vi: 'Nhân vật đua', en: 'Runner sprite' },
  }),
  copy: z
    .object({
      title: field.localized({
        label: { vi: 'Tiêu đề', en: 'Title' },
        default: { vi: 'Đua chạm tốc độ', en: 'Tap Race' },
      }),
      cta: field.localized({
        label: { vi: 'Khẩu hiệu cổ vũ', en: 'Call to action' },
        default: { vi: 'Chạm liên tục để bứt tốc!', en: 'Tap fast to sprint!' },
      }),
    })
    .prefault({})
    .register(fieldRegistry, { group: 'content', hotEditable: true }),
});

export type TapRaceConfig = z.infer<typeof tapRaceConfigSchema>;

export interface TapRaceRacer {
  id: string;
  name: string;
  team: string;
  score: number;
  lastInputAt: number;
}

export interface TapRaceState {
  endsAt: number | null;
  racers: Record<string, TapRaceRacer>;
}

export interface TapRaceScreenView {
  status: RoundStatus;
  online: number;
  endsAt: number | null;
  top: Array<{ id: string; name: string; team: string; score: number }>;
  teams: Array<{ team: string; score: number }>;
  serverTs: number;
}

export interface TapRacePlayerView {
  status: RoundStatus;
  endsAt: number | null;
  score: number;
  rank: number;
  teamScore: number;
  serverTs: number;
}

interface DerivedTapRaceView {
  ranked: TapRaceRacer[];
  rankById: Map<string, number>;
  teams: Array<{ team: string; score: number }>;
  teamScoreByKey: Map<string, number>;
}

const derivedViewCache = new WeakMap<TapRaceState, DerivedTapRaceView>();

function getDerivedView(state: TapRaceState): DerivedTapRaceView {
  const cached = derivedViewCache.get(state);
  if (cached) return cached;

  const ranked = Object.values(state.racers).sort((a, b) => b.score - a.score);
  const rankById = new Map<string, number>();
  const teamScoreByKey = new Map<string, number>();

  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    if (!r) continue;
    rankById.set(r.id, i + 1);
    teamScoreByKey.set(r.team, (teamScoreByKey.get(r.team) ?? 0) + r.score);
  }

  const teams = [...teamScoreByKey]
    .map(([team, score]) => ({ team, score }))
    .sort((a, b) => b.score - a.score);

  const derived: DerivedTapRaceView = { ranked, rankById, teams, teamScoreByKey };
  derivedViewCache.set(state, derived);
  return derived;
}

function resetRacerScores(racers: Record<string, TapRaceRacer>): Record<string, TapRaceRacer> {
  const reset: Record<string, TapRaceRacer> = {};
  for (const [id, r] of Object.entries(racers)) {
    reset[id] = { ...r, score: 0, lastInputAt: Number.NEGATIVE_INFINITY };
  }
  return reset;
}

export const tapRaceServer: LiveServerModule<
  TapRaceConfig,
  TapRaceState,
  TapRaceAction,
  TapRacePlayerView,
  TapRaceScreenView
> = {
  kind: 'live',
  actionSchema: tapRaceActionSchema,
  tickHz: 10,

  init(_config: TapRaceConfig, ctx: RoomContext<TapRaceConfig>): TapRaceState {
    const racers: Record<string, TapRaceRacer> = {};
    for (const player of ctx.players.values()) {
      racers[player.playerId] = {
        id: player.playerId,
        name: player.displayName,
        team: player.team ?? 'Chung',
        score: 0,
        lastInputAt: Number.NEGATIVE_INFINITY,
      };
    }
    return {
      endsAt: null,
      racers,
    };
  },

  onPlayerJoin(
    state: TapRaceState,
    player: PlayerRef,
    _ctx: RoomContext<TapRaceConfig>,
  ): TapRaceState {
    if (state.racers[player.playerId]) return state;
    state.racers[player.playerId] = {
      id: player.playerId,
      name: player.displayName,
      team: player.team ?? 'Chung',
      score: 0,
      lastInputAt: Number.NEGATIVE_INFINITY,
    };
    return {
      endsAt: state.endsAt,
      racers: state.racers,
    };
  },

  onPlayerLeave(
    state: TapRaceState,
    playerId: string,
    ctx: RoomContext<TapRaceConfig>,
  ): TapRaceState {
    // Scores survive disconnects; only lobby leavers are dropped.
    if (ctx.status !== 'lobby' || !state.racers[playerId]) {
      return state;
    }
    delete state.racers[playerId];
    return {
      endsAt: state.endsAt,
      racers: state.racers,
    };
  },

  onHostCommand(state: TapRaceState, cmd, ctx: RoomContext<TapRaceConfig>): TapRaceState {
    switch (cmd.cmd) {
      case 'round.open':
        return {
          endsAt: null,
          racers: resetRacerScores(state.racers),
        };
      case 'round.start':
        return {
          endsAt: ctx.now() + ctx.config.durationSec * 1_000,
          racers: resetRacerScores(state.racers),
        };
      case 'round.end':
        return {
          ...state,
          endsAt: ctx.now(),
        };
      default:
        return state;
    }
  },

  onPlayerAction(
    state: TapRaceState,
    player: PlayerRef,
    action: TapRaceAction,
    ctx: RoomContext<TapRaceConfig>,
  ): TapRaceState {
    if (ctx.status !== 'playing') return state;
    const racer = state.racers[player.playerId];
    if (!racer) return state;

    const now = ctx.now();
    if (now - racer.lastInputAt < ctx.config.minInputIntervalMs) {
      return state;
    }

    const delta = Math.min(action.d, ctx.config.maxDeltaPerInput);
    racer.score += delta;
    racer.lastInputAt = now;
    return {
      endsAt: state.endsAt,
      racers: state.racers,
    };
  },

  onTick(state: TapRaceState, ctx: RoomContext<TapRaceConfig>): TapRaceState {
    if (ctx.status === 'playing' && state.endsAt !== null && ctx.now() >= state.endsAt) {
      ctx.setStatus('result');
    }
    return state;
  },

  toScreenView(state: TapRaceState, ctx: RoomContext<TapRaceConfig>): TapRaceScreenView {
    const { ranked, teams } = getDerivedView(state);
    return {
      status: ctx.status,
      online: ranked.length,
      endsAt: state.endsAt,
      top: ranked
        .slice(0, ctx.config.topN)
        .map(({ id, name, team, score }) => ({ id, name, team, score })),
      teams,
      serverTs: ctx.now(),
    };
  },

  toPlayerView(
    state: TapRaceState,
    player: PlayerRef,
    ctx: RoomContext<TapRaceConfig>,
  ): TapRacePlayerView {
    const { ranked, rankById, teamScoreByKey } = getDerivedView(state);
    const racer = state.racers[player.playerId];
    const rank = rankById.get(player.playerId) ?? ranked.length + 1;
    const teamKey = racer?.team ?? player.team ?? 'Chung';

    return {
      status: ctx.status,
      endsAt: state.endsAt,
      score: racer?.score ?? 0,
      rank,
      teamScore: teamScoreByKey.get(teamKey) ?? 0,
      serverTs: ctx.now(),
    };
  },

  finalize(state: TapRaceState, _ctx: RoomContext<TapRaceConfig>): RoundResult {
    const { ranked, teams } = getDerivedView(state);
    return {
      ranking: ranked.map((r) => ({
        playerId: r.id,
        score: r.score,
        team: r.team,
      })),
      teams,
    };
  },
};

export function TapRacePlayer(
  _props: PlayerProps<TapRaceConfig, TapRacePlayerView, TapRaceAction>,
) {
  return null;
}

export function TapRaceScreen(_props: ScreenProps<TapRaceConfig, TapRaceScreenView>) {
  return null;
}

export function TapRaceHostPanel(
  _props: HostPanelProps<TapRaceConfig, TapRaceScreenView, TapRaceAction>,
) {
  return null;
}

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
  Player: TapRacePlayer,
  Screen: TapRaceScreen,
  HostPanel: TapRaceHostPanel,
  server: tapRaceServer,
});

export default tapRaceTemplate;
