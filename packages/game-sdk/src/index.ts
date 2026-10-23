import type { HostCommand, RoundStatus } from '@playora/contracts';
import type { ComponentType } from 'react';
import type { z } from 'zod';

/** See docs/04-game-catalog.md §1 and docs/12-builder-spec.md §2.1. */
export type GameKind = 'instant' | 'skill' | 'live' | 'draw' | 'display';
export type Audience = 'player' | 'screen' | 'host';
export type Locale = 'vi' | 'en';
export type LocalizedText = Partial<Record<Locale, string>> & { vi: string };
export type SemVer = `${number}.${number}.${number}`;

export interface AssetSlot {
  key: string;
  label: LocalizedText;
  required?: boolean;
  /** e.g. '1:1', '16:9' */
  ratio?: string;
  minPx?: number;
  transparent?: boolean;
  /** Brand kit tokens (logo, colors) may be mapped into this slot. */
  brandable?: boolean;
  accept: Array<'image' | 'audio' | 'video'>;
}

export interface Skin<C> {
  key: string;
  name: LocalizedText;
  /** Occasion/season tags used by the gallery: 'tet', 'yep', 'trung-thu'… */
  tags: string[];
  assets: Record<string, string>;
  config?: Partial<C>;
}

export interface BrandKit {
  logoUrl?: string;
  colors: { primary: string; secondary?: string; background: string; text: string };
  fontHeading?: string;
  fontBody?: string;
}

export interface AssetResolver {
  url(slotKey: string, opts?: { width?: number }): string | undefined;
}

export interface RoomClient<V = unknown> {
  status: RoundStatus;
  view: V | null;
  serverNow(): number;
  send(data: unknown): void;
}

export interface SurfaceProps<C> {
  config: C;
  brand: BrandKit;
  assets: AssetResolver;
  locale: Locale;
  quality: 'high' | 'low';
}

export interface PlayerProps<C, V = unknown> extends SurfaceProps<C> {
  room?: RoomClient<V>;
}

export interface ScreenProps<C, V = unknown> extends SurfaceProps<C> {
  room: RoomClient<V>;
}

export interface HostPanelProps<C, V = unknown> extends SurfaceProps<C> {
  room: RoomClient<V>;
  command(cmd: HostCommand): Promise<void>;
}

export interface PlayerRef {
  playerId: string;
  displayName: string;
  team?: string;
}

export interface RoomContext<C> {
  eventId: string;
  roundId: string;
  config: C;
  now(): number;
}

export interface RoundResult {
  ranking: Array<{ playerId: string; score: number; team?: string }>;
  teams?: Array<{ team: string; score: number }>;
}

/** Server half of a live template; runs inside apps/realtime. */
export interface LiveServerModule<C, S> {
  kind: 'live';
  inputSchema: z.ZodType;
  tickHz?: number;
  init(ctx: RoomContext<C>): S;
  onCommand(state: S, cmd: HostCommand, ctx: RoomContext<C>): void;
  onInput(state: S, from: PlayerRef, input: unknown, ctx: RoomContext<C>): void;
  tick?(state: S, ctx: RoomContext<C>): void;
  view(state: S, audience: Audience, player?: PlayerRef): unknown;
  finalize(state: S): RoundResult;
}

type Lazy<T> = () => Promise<{ default: T }>;

export interface TemplateDefinition<Schema extends z.ZodType, S = unknown> {
  key: string;
  version: SemVer;
  kind: GameKind;
  meta: { name: LocalizedText; description: LocalizedText; thumbnail: string; tags: string[] };
  configSchema: Schema;
  defaultConfig: z.infer<Schema>;
  assetSlots: AssetSlot[];
  skins: Skin<z.infer<Schema>>[];
  /** Config paths that may change while the game is live without publishing a new version. */
  hotEditable?: string[];
  surfaces: {
    player?: Lazy<ComponentType<PlayerProps<z.infer<Schema>>>>;
    screen?: Lazy<ComponentType<ScreenProps<z.infer<Schema>>>>;
    host?: Lazy<ComponentType<HostPanelProps<z.infer<Schema>>>>;
  };
  server?: Lazy<LiveServerModule<z.infer<Schema>, S>>;
}

export function defineTemplate<Schema extends z.ZodType, S = unknown>(
  definition: TemplateDefinition<Schema, S>,
): TemplateDefinition<Schema, S> {
  return definition;
}
