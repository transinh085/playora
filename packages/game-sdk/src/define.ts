import type { z } from 'zod';
import {
  collectReferencedSlotKeys,
  describeConfigSchema,
  type FormDescriptor,
  schemaHasPath,
  toConfigJsonSchema,
} from './fields';
import type {
  AssetSlot,
  GameKind,
  HostPanelProps,
  LiveServerModule,
  LocalizedText,
  PlayerProps,
  ScreenProps,
  SemVer,
  ServerModuleEntry,
  Skin,
  SurfaceComponent,
  TemplateMeta,
} from './types';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;
const RATIO_REGEX = /^([1-9]\d*):([1-9]\d*)$/;

export class TemplateValidationError extends Error {
  readonly issues: string[];

  constructor(templateId: string, issues: string[]) {
    super(`Invalid template "${templateId || '<unnamed>'}": ${issues.join('; ')}`);
    this.name = 'TemplateValidationError';
    this.issues = issues;
  }
}

export interface DefineTemplateInput<
  Schema extends z.ZodType,
  S = unknown,
  A = unknown,
  PV = unknown,
  SV = unknown,
> {
  /** Unique template identifier (kebab-case slug, e.g. 'tap-race'). */
  id: string;
  version: SemVer;
  kind: GameKind;
  /** Localized display name (`vi` required). */
  name: LocalizedText;
  description?: LocalizedText;
  thumbnail?: string;
  tags?: string[];
  configSchema: Schema;
  defaultConfig?: z.infer<Schema>;
  assetSlots?: AssetSlot[];
  skins?: Skin<z.infer<Schema>>[];
  /** Config paths that may change while the game is live without publishing a new version. */
  hotEditable?: string[];
  Player?: SurfaceComponent<PlayerProps<z.infer<Schema>, PV, A>>;
  Screen?: SurfaceComponent<ScreenProps<z.infer<Schema>, SV>>;
  HostPanel?: SurfaceComponent<HostPanelProps<z.infer<Schema>, SV, A>>;
  server?: ServerModuleEntry<LiveServerModule<z.infer<Schema>, S, A, PV, SV>>;
}

export interface TemplateDefinition<
  Schema extends z.ZodType,
  S = unknown,
  A = unknown,
  PV = unknown,
  SV = unknown,
> {
  id: string;
  version: SemVer;
  kind: GameKind;
  name: LocalizedText;
  description: LocalizedText;
  thumbnail: string;
  tags: string[];
  meta: TemplateMeta;
  configSchema: Schema;
  defaultConfig: z.infer<Schema>;
  assetSlots: AssetSlot[];
  skins: Skin<z.infer<Schema>>[];
  hotEditable: string[];
  Player?: SurfaceComponent<PlayerProps<z.infer<Schema>, PV, A>>;
  Screen?: SurfaceComponent<ScreenProps<z.infer<Schema>, SV>>;
  HostPanel?: SurfaceComponent<HostPanelProps<z.infer<Schema>, SV, A>>;
  server?: ServerModuleEntry<LiveServerModule<z.infer<Schema>, S, A, PV, SV>>;
  /** Pre-computed serializable auto-form descriptor for Studio. */
  formDescriptor: FormDescriptor;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function defineTemplate<
  Schema extends z.ZodType,
  S = unknown,
  A = unknown,
  PV = unknown,
  SV = unknown,
>(input: DefineTemplateInput<Schema, S, A, PV, SV>): TemplateDefinition<Schema, S, A, PV, SV> {
  const issues: string[] = [];

  const id = input.id?.trim() ?? '';
  if (!id || !SLUG_REGEX.test(id)) {
    issues.push(`Template id "${id}" must be a non-empty kebab-case slug`);
  }

  if (!SEMVER_REGEX.test(input.version)) {
    issues.push(`Template version "${input.version}" must follow semver (x.y.z)`);
  }

  if (!input.name || typeof input.name.vi !== 'string' || input.name.vi.trim().length === 0) {
    issues.push('Template must provide a localized name with a non-empty "vi" string');
  }

  const rootJson = toConfigJsonSchema(input.configSchema);
  const isObjectSchema = rootJson.type === 'object' && Boolean(rootJson.properties);
  if (!isObjectSchema) {
    issues.push('configSchema must be a ZodObject schema');
  }

  const assetSlots = input.assetSlots ?? [];
  const slotByKey = new Map<string, AssetSlot>();
  for (const slot of assetSlots) {
    const slotKey = slot.key.trim();
    if (!slotKey) {
      issues.push('Asset slot key must not be empty');
      continue;
    }
    if (slotByKey.has(slotKey)) {
      issues.push(`Duplicate asset slot key "${slotKey}"`);
    } else {
      slotByKey.set(slotKey, slot);
    }
    if (!slot.label?.vi || slot.label.vi.trim().length === 0) {
      issues.push(`Asset slot "${slotKey}" must have a non-empty Vietnamese label`);
    }
    if (!Array.isArray(slot.accept) || slot.accept.length === 0) {
      issues.push(`Asset slot "${slotKey}" must accept at least one media type`);
    }
    if (slot.ratio !== undefined && !RATIO_REGEX.test(slot.ratio)) {
      issues.push(`Asset slot "${slotKey}" has invalid aspect ratio "${slot.ratio}"`);
    }
    if (slot.minPx !== undefined && (!Number.isFinite(slot.minPx) || slot.minPx <= 0)) {
      issues.push(`Asset slot "${slotKey}" minPx must be a positive number`);
    }
  }

  if (isObjectSchema) {
    const referencedSlots = collectReferencedSlotKeys(input.configSchema);
    for (const ref of referencedSlots) {
      if (!slotByKey.has(ref.slotKey)) {
        issues.push(`Config field "${ref.path}" references unknown asset slot "${ref.slotKey}"`);
      }
    }
  }

  const hotEditable = input.hotEditable ?? [];
  const seenHotKeys = new Set<string>();
  for (const hotKey of hotEditable) {
    const trimmed = hotKey.trim();
    if (!trimmed) {
      issues.push('hotEditable path must not be empty');
      continue;
    }
    if (seenHotKeys.has(trimmed)) {
      issues.push(`Duplicate hotEditable path "${trimmed}"`);
      continue;
    }
    seenHotKeys.add(trimmed);
    if (isObjectSchema && !schemaHasPath(input.configSchema, trimmed)) {
      issues.push(`hotEditable path "${trimmed}" does not exist in configSchema`);
    }
  }

  let resolvedDefaultConfig: z.infer<Schema> = undefined as z.infer<Schema>;
  let hasValidDefaultConfig = false;
  if (isObjectSchema) {
    if (input.defaultConfig !== undefined) {
      const parsed = input.configSchema.safeParse(input.defaultConfig);
      if (!parsed.success) {
        issues.push(`defaultConfig failed schema validation: ${parsed.error.message}`);
      } else {
        resolvedDefaultConfig = parsed.data;
        hasValidDefaultConfig = true;
      }
    } else {
      const parsedEmpty = input.configSchema.safeParse({});
      if (parsedEmpty.success) {
        resolvedDefaultConfig = parsedEmpty.data;
        hasValidDefaultConfig = true;
      } else {
        issues.push(
          'defaultConfig required because configSchema has required fields without defaults',
        );
      }
    }
  }

  const knownTopKeys = new Set(Object.keys(rootJson.properties ?? {}));
  const skins = input.skins ?? [];
  const seenSkins = new Set<string>();
  for (const skin of skins) {
    const skinKey = skin.key.trim();
    if (!skinKey) {
      issues.push('Skin key must not be empty');
      continue;
    }
    if (seenSkins.has(skinKey)) {
      issues.push(`Duplicate skin key "${skinKey}"`);
    } else {
      seenSkins.add(skinKey);
    }

    if (!skin.name?.vi || skin.name.vi.trim().length === 0) {
      issues.push(`Skin "${skinKey}" must have a non-empty Vietnamese name`);
    }

    for (const [assetKey, assetUrl] of Object.entries(skin.assets ?? {})) {
      if (!slotByKey.has(assetKey)) {
        issues.push(`Skin "${skinKey}" provides unknown asset slot "${assetKey}"`);
      }
      if (typeof assetUrl !== 'string' || assetUrl.trim().length === 0) {
        issues.push(`Skin "${skinKey}" asset "${assetKey}" must be a non-empty URL or path`);
      }
    }

    for (const slot of assetSlots) {
      if (slot.required && !slot.brandable && !skin.assets?.[slot.key]) {
        issues.push(`Skin "${skinKey}" is missing required asset slot "${slot.key}"`);
      }
    }

    if (skin.config && isObjectSchema) {
      let hasUnknownKey = false;
      for (const [cfgKey, cfgVal] of Object.entries(skin.config)) {
        if (cfgVal === undefined) continue;
        if (!knownTopKeys.has(cfgKey)) {
          issues.push(`Skin "${skinKey}" config contains unknown key "${cfgKey}"`);
          hasUnknownKey = true;
        }
      }

      if (!hasUnknownKey && hasValidDefaultConfig && isPlainObject(resolvedDefaultConfig)) {
        const merged: Record<string, unknown> = { ...resolvedDefaultConfig };
        for (const [cfgKey, cfgVal] of Object.entries(skin.config)) {
          if (cfgVal === undefined) continue;
          const baseVal = merged[cfgKey];
          merged[cfgKey] =
            isPlainObject(baseVal) && isPlainObject(cfgVal) ? { ...baseVal, ...cfgVal } : cfgVal;
        }
        const res = input.configSchema.safeParse(merged);
        if (!res.success) {
          for (const issue of res.error.issues) {
            const fieldKey = String(issue.path[0] ?? '');
            issues.push(`Skin "${skinKey}" has invalid config for "${fieldKey}": ${issue.message}`);
          }
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new TemplateValidationError(id, issues);
  }

  const description = input.description ?? input.name;
  const thumbnail = input.thumbnail ?? '';
  const tags = input.tags ?? [];
  const meta: TemplateMeta = {
    name: input.name,
    description,
    thumbnail,
    tags,
  };

  const formDescriptor = describeConfigSchema(input.configSchema, { hotEditable });
  const mergedHotEditable = Array.from(
    new Set([...hotEditable, ...formDescriptor.hotEditablePaths]),
  );

  return {
    id,
    version: input.version,
    kind: input.kind,
    name: input.name,
    description,
    thumbnail,
    tags,
    meta,
    configSchema: input.configSchema,
    defaultConfig: resolvedDefaultConfig,
    assetSlots,
    skins,
    hotEditable: mergedHotEditable,
    Player: input.Player,
    Screen: input.Screen,
    HostPanel: input.HostPanel,
    server: input.server,
    formDescriptor,
  };
}
