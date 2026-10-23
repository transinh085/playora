import type { HostPanelProps, PlayerProps, ScreenProps } from '@playora/game-sdk';
import type { ComponentType } from 'react';
import { getTemplate, tapRaceTemplate } from './registry';
import { TapRaceHostPanel, TapRacePlayer, TapRaceScreen } from './tap-race';

export * from './registry';
export { TapRaceHostPanel, TapRacePlayer, TapRaceScreen } from './tap-race';

// biome-ignore lint/suspicious/noExplicitAny: Heterogeneous surface registry
export interface TemplateSurfaces<C = any, PV = any, SV = any, A = any> {
  Player: ComponentType<PlayerProps<C, PV, A>>;
  Screen: ComponentType<ScreenProps<C, SV>>;
  HostPanel?: ComponentType<HostPanelProps<C, SV, A>>;
}

export const surfaces: Readonly<Record<string, TemplateSurfaces>> = Object.freeze({
  [`${tapRaceTemplate.id}@${tapRaceTemplate.version}`]: {
    Player: TapRacePlayer,
    Screen: TapRaceScreen,
    HostPanel: TapRaceHostPanel,
  },
});

export function getTemplateSurfaces(id: string, version?: string): TemplateSurfaces | undefined {
  const tpl = getTemplate(id, version);
  if (!tpl) return undefined;
  return surfaces[`${tpl.id}@${tpl.version}`];
}
