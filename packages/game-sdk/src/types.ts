import type { ComponentType } from 'react';
import type { z } from 'zod';

/** See docs/04-game-catalog.md §1, docs/12-builder-spec.md §2.1, and ADR-012 §3. */
export type GameKind = 'instant' | 'skill';
export type Locale = 'vi' | 'en';
export type LocalizedText = Partial<Record<Locale, string>> & { vi: string };
export type SemVer = `${number}.${number}.${number}`;
export type AssetMediaType = 'image' | 'audio' | 'video';

export type PrizeType =
  | 'physical'
  | 'voucher_code'
  | 'e_gift'
  | 'digital'
  | 'points'
  | 'consolation'
  | 'no_prize';

/** Server-decided play outcome; client only renders. */
export type PlayOutcome =
  | {
      kind: 'win';
      prize: { id: string; name: LocalizedText; type: PrizeType; imageUrl?: string };
      voucherCode?: string;
    }
  | { kind: 'lose' }
  | { kind: 'out_of_stock' };

/** instant: transforms a server-decided outcome into display data (e.g. target wheel segment). Runs on server. */
export interface InstantServerModule<C, D> {
  present(outcome: PlayOutcome, config: C, rng: () => number): D;
}

/** skill: validates player submission (score, duration) before prize evaluation. Runs on server. */
export interface SkillServerModule<C, Sub, D = undefined> {
  submissionSchema: z.ZodType<Sub>;
  validate(
    sub: Sub,
    ctx: { config: C; startedAt: number; endedAt: number },
  ): { ok: true; score: number } | { ok: false; reason: string };
  /** Score >= threshold qualifies for a prize evaluation (`score_threshold`). */
  qualifies(score: number, config: C): boolean;
  present?(outcome: PlayOutcome, config: C, rng: () => number): D;
}

export type PlaySessionState =
  | 'ready'
  | 'starting'
  | 'playing'
  | 'submitting'
  | 'done'
  | 'blocked'
  | 'error';

export type PlayBlockedReason = 'not_open' | 'no_plays_left' | 'ended' | 'flagged';

/** Player surface talks only to the session and does not know about HTTP APIs. */
export interface PlaySession<D, Sub = never> {
  state: PlaySessionState;
  remaining: { today: number | null; total: number | null };
  /** instant: start plays immediately and populates `result`. skill: enters `'playing'`. */
  start(): Promise<void>;
  /** skill only: submits the play payload for validation and outcome resolution. */
  submit(sub: Sub): Promise<void>;
  result: { outcome: PlayOutcome; display: D } | null;
  blockedReason?: PlayBlockedReason;
}

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

export interface PlayerProps<C, D, Sub = never> {
  config: C;
  brand: BrandKit;
  assets: AssetResolver;
  skin?: string;
  locale: Locale;
  quality: 'high' | 'low';
  session: PlaySession<D, Sub>;
  /** Signals the Play shell to transition to the standard result screen. */
  onFinished(): void;
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
