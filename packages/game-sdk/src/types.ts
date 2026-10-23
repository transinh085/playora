import type { HostCommand, RoundStatus } from '@playora/contracts';
import type { ComponentType } from 'react';
import type { z } from 'zod';

/** See docs/04-game-catalog.md §1 and docs/12-builder-spec.md §2.1. */
export type GameKind = 'instant' | 'skill' | 'live' | 'draw' | 'display';
export type Audience = 'player' | 'screen' | 'host';
export type Locale = 'vi' | 'en';
export type LocalizedText = Partial<Record<Locale, string>> & { vi: string };
export type SemVer = `${number}.${number}.${number}`;
export type AssetMediaType = 'image' | 'audio' | 'video';

export interface AssetSlot {
  key: string;
  label: LocalizedText;
  required?: boolean;
  /** Aspect ratio hint, e.g. '1:1', '16:9'. */
  ratio?: string;
  minPx?: number;
  transparent?: boolean;
  /** Brand kit tokens (logo, colors) may be mapped into this slot. */
  brandable?: boolean;
  accept: AssetMediaType[];
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
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    background: string;
    text: string;
  };
  fontHeading?: string;
  fontBody?: string;
}

export interface AssetResolver {
  url(slotKey: string, opts?: { width?: number }): string | undefined;
  /** All resolved asset URLs keyed by slotKey. */
  readonly all: Readonly<Record<string, string>>;
}

export interface ClockReader {
  /** Estimated server timestamp in milliseconds (`clientNow + offsetMs`). */
  now(): number;
  /** Estimated clock offset (`serverTime - clientTime`) in milliseconds. */
  readonly offsetMs: number;
}

export interface RoomClient<V = unknown, A = unknown> {
  status: RoundStatus;
  view: V | null;
  serverNow(): number;
  send(action: A): void;
}

export interface SurfaceProps<C, V = unknown> {
  config: C;
  brand: BrandKit;
  assets: AssetResolver;
  skin?: string;
  status: RoundStatus;
  state: V | null;
  clock: ClockReader;
  locale: Locale;
  quality: 'high' | 'low';
}

export interface PlayerProps<C, V = unknown, A = unknown> extends SurfaceProps<C, V> {
  player?: PlayerRef;
  send(action: A): void;
  room?: RoomClient<V, A>;
}

export interface ScreenProps<C, V = unknown> extends SurfaceProps<C, V> {
  room?: RoomClient<V>;
}

export interface HostPanelProps<C, V = unknown, A = unknown> extends SurfaceProps<C, V> {
  send(action: A): void;
  command(cmd: HostCommand): Promise<void>;
  room?: RoomClient<V, A>;
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
  status: RoundStatus;
  players: ReadonlyMap<string, PlayerRef>;
  now(): number;
  setStatus(status: RoundStatus): void;
}

export interface RoundResult {
  ranking: Array<{ playerId: string; score: number; team?: string }>;
  teams?: Array<{ team: string; score: number }>;
}

/**
 * Server-authoritative module for a live game template; runs inside `apps/realtime`.
 * Handlers may either mutate `state` in place (returning `void`) or return a new `S`.
 */
export interface LiveServerModule<C, S, A = unknown, PV = unknown, SV = unknown> {
  kind?: 'live';
  /** Zod schema used to validate incoming player actions before `onPlayerAction`. */
  actionSchema?: z.ZodType<A>;
  /** Server tick frequency in Hz (default 10). */
  tickHz?: number;
  init(config: C, ctx: RoomContext<C>): S;
  onPlayerJoin?(state: S, player: PlayerRef, ctx: RoomContext<C>): S | undefined;
  onPlayerLeave?(state: S, playerId: string, ctx: RoomContext<C>): S | undefined;
  onPlayerAction(state: S, player: PlayerRef, action: A, ctx: RoomContext<C>): S | undefined;
  onTick?(state: S, ctx: RoomContext<C>): S | undefined;
  onHostCommand?(state: S, cmd: HostCommand, ctx: RoomContext<C>): S | undefined;
  toPlayerView(state: S, player: PlayerRef, ctx: RoomContext<C>): PV;
  toScreenView(state: S, ctx: RoomContext<C>): SV;
  finalize(state: S, ctx: RoomContext<C>): RoundResult;
}

export type Lazy<T> = () => Promise<{ default: T } | T>;
export type SurfaceComponent<P> = ComponentType<P> | Lazy<ComponentType<P>>;
export type ServerModuleEntry<M> = M | Lazy<M>;

export interface TemplateMeta {
  name: LocalizedText;
  description: LocalizedText;
  thumbnail: string;
  tags: string[];
}

export type FieldWidget =
  | 'text'
  | 'richtext'
  | 'number'
  | 'slider'
  | 'switch'
  | 'segmented'
  | 'select'
  | 'color'
  | 'asset'
  | 'sound'
  | 'list'
  | 'localized'
  | 'prize-picker'
  | 'datetime-range'
  | 'object';

export type FieldValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'array'
  | 'object'
  | 'localized';

export interface FieldOption {
  value: string;
  label?: LocalizedText;
}

export interface FieldDescriptor {
  path: string;
  key: string;
  type: FieldValueType;
  widget: FieldWidget;
  label?: LocalizedText;
  description?: LocalizedText;
  placeholder?: LocalizedText;
  group?: string;
  required: boolean;
  defaultValue?: unknown;
  hotEditable: boolean;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: FieldOption[];
  presets?: Record<string, Record<string, unknown>>;
  slotKey?: string;
  minItems?: number;
  maxItems?: number;
  itemLabel?: LocalizedText;
  item?: FieldDescriptor;
  fields?: FieldDescriptor[];
}

export interface FormDescriptor {
  fields: FieldDescriptor[];
  groups: string[];
  hotEditablePaths: string[];
}

export interface FieldMeta {
  [key: string]: unknown;
  widget?: FieldWidget;
  label?: LocalizedText;
  description?: LocalizedText;
  placeholder?: LocalizedText;
  group?: string;
  hotEditable?: boolean;
  step?: number;
  slotKey?: string;
  itemLabel?: LocalizedText;
  optionLabels?: Record<string, LocalizedText | string>;
  presets?: Record<string, Record<string, unknown>>;
}

export interface BaseFieldOptions {
  label?: LocalizedText | string;
  description?: LocalizedText | string;
  group?: string;
  hotEditable?: boolean;
}

export interface NumberFieldOptions extends BaseFieldOptions {
  min?: number;
  max?: number;
  step?: number;
  int?: boolean;
  default?: number;
}
export type SliderFieldOptions = NumberFieldOptions;

export interface TextFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
  placeholder?: LocalizedText | string;
  default?: string;
}

export interface BooleanFieldOptions extends BaseFieldOptions {
  default?: boolean;
}

export interface ChoiceFieldOptions<T extends string = string> extends BaseFieldOptions {
  widget?: 'segmented' | 'select';
  optionLabels?: Partial<Record<T, LocalizedText | string>>;
  presets?: Partial<Record<T, Record<string, unknown>>>;
  default?: T;
}

export interface ColorFieldOptions extends BaseFieldOptions {
  default?: string;
}

export interface AssetFieldOptions extends BaseFieldOptions {
  default?: string;
}

export interface ListFieldOptions extends BaseFieldOptions {
  min?: number;
  max?: number;
  itemLabel?: LocalizedText | string;
}

export interface LocalizedFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
  placeholder?: LocalizedText | string;
  default?: LocalizedText;
}

export type LocalizedTextSchema = z.ZodObject<{
  vi: z.ZodString;
  en: z.ZodOptional<z.ZodString>;
}>;

export interface DescribeConfigOptions {
  hotEditable?: readonly string[];
}
