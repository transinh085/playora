import type { LocalizedText, PlayerProps } from '@playora/game-sdk';
import type { EditorPanel, EditorPanelProps, WidgetProps } from '@playora/ui/auto-form';
import type { ComponentType } from 'react';
import { getTemplate, spinWheelTemplate } from './registry';
import { SpinWheelPlayer } from './spin-wheel/player';

export type { EditorPanel, EditorPanelProps, WidgetProps };

// biome-ignore lint/suspicious/noExplicitAny: Heterogeneous surface registry
export interface TemplateSurfaces<C = any, D = any, Sub = any> {
  Player: ComponentType<PlayerProps<C, D, Sub>>;
  editorWidgets?: Record<string, ComponentType<WidgetProps>>;
  editorPanels?: Array<{
    key: string;
    label: LocalizedText;
    Component: ComponentType<EditorPanelProps<C>>;
  }>;
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
