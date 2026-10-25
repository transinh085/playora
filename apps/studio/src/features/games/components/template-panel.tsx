'use client';

import { localize } from '@playora/contracts';
import {
  type AssetSlot,
  AutoForm,
  type AutoFormProps,
  type EditorPanel,
  type FormDescriptor,
  type WidgetProps,
} from '@playora/ui/auto-form';
import { Collapse, Segmented } from 'antd';
import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { useState } from 'react';

export interface TemplateEditorSurfaces {
  editorWidgets?: Readonly<Record<string, React.ComponentType<WidgetProps>>>;
  editorPanels?: ReadonlyArray<EditorPanel>;
}

export interface TemplatePanelProps {
  descriptor: FormDescriptor;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  locale: 'vi' | 'en';
  errors?: Record<string, string>;
  brandPalette?: readonly string[];
  assetSlots?: readonly AssetSlot[];
  onPickAsset?: AutoFormProps['onPickAsset'];
  surfaces?: TemplateEditorSurfaces;
  published?: boolean;
}

export function TemplatePanel({
  descriptor,
  value,
  onChange,
  locale,
  errors,
  brandPalette,
  assetSlots,
  onPickAsset,
  surfaces,
  published,
}: TemplatePanelProps) {
  const t = useTranslations();
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const groupLabel = (grp: string): string => {
    switch (grp) {
      case 'gameplay':
        return t('games.groupGameplay');
      case 'appearance':
        return t('games.groupAppearance');
      case 'content':
        return t('games.groupContent');
      default:
        return grp;
    }
  };

  return (
    <div className="flex flex-col gap-4" data-testid="template-panel">
      <div data-testid="editor-groups-column">
        <Segmented<string>
          value={selectedGroup}
          onChange={setSelectedGroup}
          options={[
            {
              value: 'all',
              label: <span data-testid="editor-group-all">{t('games.groupAll')}</span>,
            },
            ...descriptor.groups.map((grp) => ({
              value: grp,
              label: <span data-testid={`editor-group-${grp}`}>{groupLabel(grp)}</span>,
            })),
          ]}
        />
      </div>

      <AutoForm
        descriptor={descriptor}
        value={value}
        onChange={(next) => onChange(next)}
        locale={locale}
        published={published}
        errors={errors}
        activeGroup={selectedGroup === 'all' ? undefined : selectedGroup}
        brandPalette={brandPalette}
        assetSlots={assetSlots}
        widgets={surfaces?.editorWidgets}
        onPickAsset={onPickAsset}
      />

      {surfaces?.editorPanels && surfaces.editorPanels.length > 0 && (
        <Collapse
          defaultActiveKey={surfaces.editorPanels.map((p) => p.key)}
          items={surfaces.editorPanels.map((panel) => ({
            key: panel.key,
            label: localize(panel.label, locale),
            children: (
              <panel.Component
                value={value}
                onChange={(next) => onChange(next)}
                locale={locale}
                brandPalette={brandPalette}
              />
            ),
          }))}
        />
      )}
    </div>
  );
}
