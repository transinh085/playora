import type { PlayerProps } from '@playora/game-sdk';
import type { ComponentType } from 'react';
import { getTemplate, spinWheelTemplate } from './registry';
import { SpinWheelPlayer } from './spin-wheel/player';

// biome-ignore lint/suspicious/noExplicitAny: Heterogeneous surface registry
export interface TemplateSurfaces<C = any, D = any, Sub = any> {
  Player: ComponentType<PlayerProps<C, D, Sub>>;
}

export const surfaces: Readonly<Record<string, TemplateSurfaces>> = Object.freeze({
  [`${spinWheelTemplate.id}@${spinWheelTemplate.version}`]: {
    Player: SpinWheelPlayer,
  },
});

export function getTemplateSurfaces(id: string, version?: string): TemplateSurfaces | undefined {
  const tpl = getTemplate(id, version);
  if (!tpl) return undefined;
  return surfaces[`${tpl.id}@${tpl.version}`];
}
