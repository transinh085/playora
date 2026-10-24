import type { LiveServerModule } from '@playora/game-sdk/server';
import { templates } from '@playora/templates/server';
import type { z } from 'zod';

export interface RegisteredTemplate<
  C = unknown,
  S = unknown,
  A = unknown,
  PV = unknown,
  SV = unknown,
> {
  key: string;
  version: string;
  configSchema?: z.ZodType<C>;
  server: LiveServerModule<C, S, A, PV, SV>;
}

export interface TemplateRegistry {
  get(key: string, version: string): RegisteredTemplate | undefined;
  register<C, S, A, PV, SV>(entry: RegisteredTemplate<C, S, A, PV, SV>): void;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Merges published `game_versions.config` with live `games.hotConfig`.
 * Supports both nested objects (`{ copy: { title: ... } }`) and dot-path keys (`{ 'copy.title': ... }`).
 */
export function mergeGameConfig(base: unknown, hot: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = isPlainObject(base) ? structuredClone(base) : {};
  if (!isPlainObject(hot)) return result;

  const setByPath = (target: Record<string, unknown>, pathParts: string[], val: unknown) => {
    let curr = target;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!part) continue;
      if (!isPlainObject(curr[part])) {
        curr[part] = {};
      }
      curr = curr[part] as Record<string, unknown>;
    }
    const last = pathParts[pathParts.length - 1];
    if (!last) return;
    curr[last] = structuredClone(val);
  };

  for (const [key, value] of Object.entries(hot)) {
    if (key.includes('.')) {
      setByPath(result, key.split('.'), value);
    } else if (isPlainObject(result[key]) && isPlainObject(value)) {
      result[key] = mergeGameConfig(result[key], value);
    } else {
      result[key] = structuredClone(value);
    }
  }
  return result;
}

export function resolveTemplateConfig<C>(
  template: RegisteredTemplate<C>,
  versionConfig: unknown,
  hotConfig: unknown,
): C {
  const merged = mergeGameConfig(versionConfig, hotConfig);
  if (template.configSchema) {
    return template.configSchema.parse(merged);
  }
  return merged as C;
}

export function createTemplateRegistry(
  initial: readonly RegisteredTemplate[] = [],
): TemplateRegistry {
  const map = new Map<string, RegisteredTemplate>();
  const registry: TemplateRegistry = {
    get(key: string, version: string) {
      return map.get(`${key}@${version}`);
    },
    register<C, S, A, PV, SV>(entry: RegisteredTemplate<C, S, A, PV, SV>) {
      map.set(`${entry.key}@${entry.version}`, entry as RegisteredTemplate);
    },
  };
  for (const item of initial) {
    registry.register(item);
  }
  return registry;
}

/** Built from the shared `@playora/templates` registry so Studio, Play and realtime agree on templates. */
export function createDefaultTemplateRegistry(): TemplateRegistry {
  const registry = createTemplateRegistry();
  for (const tpl of templates) {
    if (!tpl.server || typeof tpl.server === 'function') continue;
    registry.register({
      key: tpl.id,
      version: tpl.version,
      configSchema: tpl.configSchema,
      server: tpl.server,
    });
  }
  return registry;
}

export const defaultTemplateRegistry = createDefaultTemplateRegistry();
