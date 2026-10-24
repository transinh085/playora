import type {
  InstantServerModule,
  SkillServerModule,
  TemplateDefinition,
} from '@playora/game-sdk/server';
import type { z } from 'zod';
import {
  DEFAULT_SPIN_WHEEL_SEGMENTS,
  type SpinWheelConfig,
  type SpinWheelDisplay,
  type SpinWheelSegment,
  spinWheelConfigSchema,
  spinWheelSegmentSchema,
  spinWheelServer,
  spinWheelTemplate,
} from './spin-wheel/definition';

export {
  DEFAULT_SPIN_WHEEL_SEGMENTS,
  type SpinWheelConfig,
  type SpinWheelDisplay,
  type SpinWheelSegment,
  spinWheelConfigSchema,
  spinWheelSegmentSchema,
  spinWheelServer,
  spinWheelTemplate,
};

// biome-ignore lint/suspicious/noExplicitAny: Heterogeneous template registry
export type RegisteredTemplate = TemplateDefinition<z.ZodType<any>, any, any>;
export type RegisteredServerTemplate = RegisteredTemplate;

// biome-ignore lint/suspicious/noExplicitAny: Heterogeneous server module map
export type AnyServerModule = InstantServerModule<any, any> | SkillServerModule<any, any, any>;

export const templates: readonly RegisteredTemplate[] = Object.freeze([spinWheelTemplate]);

export function getTemplate(id: string, version?: string): RegisteredTemplate | undefined {
  return templates.find((t) => t.id === id && (version === undefined || t.version === version));
}

export const serverModules: Readonly<Record<string, AnyServerModule>> = Object.freeze(
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

export function getServerModule(id: string, version?: string): AnyServerModule | undefined {
  if (version !== undefined) {
    return serverModules[`${id}@${version}`];
  }
  return serverModules[id];
}
