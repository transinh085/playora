import type { z } from 'zod';
import type {
  InstantTemplateDefinition,
  SkillTemplateDefinition,
  TemplateDefinition,
} from './define';
import type { PlayOutcome, PlaySession, PlaySessionState, ServerModuleEntry } from './types';

export async function resolveServerModule<M>(entry: ServerModuleEntry<M>): Promise<M> {
  if (typeof entry === 'function') {
    const loaded = await (entry as () => Promise<{ default: M } | M>)();
    if (loaded && typeof loaded === 'object' && 'default' in loaded) {
      return loaded.default;
    }
    return loaded as M;
  }
  return entry;
}

export interface PreviewSessionOptions<C, D = unknown, Sub = never> {
  template:
    | InstantTemplateDefinition<z.ZodType<C>, D>
    | SkillTemplateDefinition<z.ZodType<C>, Sub, D>
    | TemplateDefinition<z.ZodType<C>, D, Sub>;
  config?: Partial<C>;
  outcome?: PlayOutcome;
  rng?: () => number;
  remaining?: { today: number | null; total: number | null };
  startedAt?: number;
  endedAt?: number;
  onChange?: (session: PlaySession<D, Sub>) => void;
}

function resolvePreviewConfig<C>(
  template: TemplateDefinition<z.ZodType<C>, unknown, never>,
  overrides?: Partial<C>,
): C {
  const baseDefault =
    typeof template.defaultConfig === 'object' && template.defaultConfig !== null
      ? template.defaultConfig
      : {};
  const merged =
    typeof overrides === 'object' && overrides !== null
      ? { ...baseDefault, ...overrides }
      : template.defaultConfig;
  const parsed = template.configSchema.safeParse(merged ?? {});
  return parsed.success ? parsed.data : ((merged ?? template.defaultConfig) as C);
}

/**
 * In-memory preview session running `template.server.present(outcome, config, rng)` locally
 * (and `validate` + `qualifies` + `present` for skill templates) without calling the API or prize engine.
 */
export function createPreviewSession<C, D = unknown, Sub = never>(
  options: PreviewSessionOptions<C, D, Sub>,
): PlaySession<D, Sub> {
  const {
    template,
    config,
    outcome = { kind: 'lose' },
    rng = Math.random,
    remaining = { today: null, total: null },
    startedAt = 0,
    endedAt = 1000,
    onChange,
  } = options;

  const resolvedConfig = resolvePreviewConfig(
    template as TemplateDefinition<z.ZodType<C>, unknown, never>,
    config,
  );

  let currentState: PlaySessionState = 'ready';
  let currentResult: { outcome: PlayOutcome; display: D } | null = null;

  const session: PlaySession<D, Sub> = {
    get state() {
      return currentState;
    },
    set state(next: PlaySessionState) {
      currentState = next;
    },
    remaining,
    get result() {
      return currentResult;
    },
    set result(next: { outcome: PlayOutcome; display: D } | null) {
      currentResult = next;
    },
    async start() {
      if (template.kind === 'instant') {
        const display = template.server.present(outcome, resolvedConfig, rng);
        currentResult = { outcome, display };
        currentState = 'done';
        onChange?.(session);
        return;
      }

      currentResult = null;
      currentState = 'playing';
      onChange?.(session);
    },
    async submit(sub: Sub) {
      if (template.kind !== 'skill') {
        return;
      }

      const parsedSub = template.server.submissionSchema.safeParse(sub);
      if (!parsedSub.success) {
        currentResult = null;
        currentState = 'error';
        onChange?.(session);
        return;
      }

      const validation = template.server.validate(parsedSub.data, {
        config: resolvedConfig,
        startedAt,
        endedAt,
      });
      if (!validation.ok) {
        currentResult = null;
        currentState = 'error';
        onChange?.(session);
        return;
      }

      const qualified = template.server.qualifies(validation.score, resolvedConfig);
      const effectiveOutcome: PlayOutcome = qualified ? outcome : { kind: 'lose' };
      const display = template.server.present
        ? template.server.present(effectiveOutcome, resolvedConfig, rng)
        : (undefined as D);

      currentResult = { outcome: effectiveOutcome, display };
      currentState = 'done';
      onChange?.(session);
    },
  };

  return session;
}
