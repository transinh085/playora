import { describe, expect, test } from 'bun:test';
import { AutoForm, type FormDescriptor } from '@playora/ui/auto-form';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type EditorPanelProps,
  getTemplateSurfaces,
  spinWheelTemplate,
  type TemplateSurfaces,
  type WidgetProps,
} from './index';

function CustomSegmentWidget({ path, value, locale }: WidgetProps<string>) {
  return (
    <div data-testid="surface-custom-widget" data-path={path} data-locale={locale}>
      {String(value ?? '')}
    </div>
  );
}

function CustomWheelPanel({ value, locale }: EditorPanelProps<{ segmentsCount: number }>) {
  return (
    <div data-testid="surface-custom-panel" data-locale={locale}>
      Segments:{value.segmentsCount}
    </div>
  );
}

function DummyPlayer({ config }: { config: { segmentsCount: number } }) {
  return <div>{config.segmentsCount}</div>;
}

describe('TemplateSurfaces editor escape hatches (§2.5)', () => {
  test('renders full spin-wheel config form in AutoForm with segments list, sliders, asset slots, and localized copy', () => {
    const html = renderToStaticMarkup(
      <AutoForm
        descriptor={spinWheelTemplate.formDescriptor}
        configSchema={spinWheelTemplate.configSchema}
        value={spinWheelTemplate.defaultConfig as unknown as Record<string, unknown>}
        assetSlots={spinWheelTemplate.assetSlots}
        onChange={() => {}}
        locale="vi"
      />,
    );

    expect(html).toContain('Các ô trên vòng quay');
    expect(html).toContain('Ô vòng quay #1');
    expect(html).toContain('Ô vòng quay #6');
    expect(html).toContain('aria-label="Số vòng quay value"');
    expect(html).toContain('aria-label="Thời gian quay (ms) value"');
    expect(html).toContain('Ảnh nền');
    expect(html).toContain('9:16 · ≥720px');
    expect(html).toContain('Logo tâm vòng quay');
    expect(html).toContain('1:1 · ≥128px');
    expect(html).toContain('value="Vòng quay may mắn"');
    expect(html).toContain('value="Quay ngay"');
  });

  test('supports optional editorWidgets and editorPanels on TemplateSurfaces and passes editorWidgets to AutoForm', () => {
    const baseSurface = getTemplateSurfaces('spin-wheel', '1.0.0');
    expect(baseSurface).toBeDefined();
    expect(baseSurface?.Player).toBeDefined();
    expect((baseSurface?.Player as { $$typeof?: symbol })?.$$typeof).toBe(Symbol.for('react.lazy'));
    expect(baseSurface?.editorWidgets).toBeUndefined();
    expect(baseSurface?.editorPanels).toBeUndefined();

    const customSurfaces: TemplateSurfaces<{ segmentsCount: number }, { idx: number }> = {
      Player: DummyPlayer,
      editorWidgets: {
        'wheel-segment-picker': CustomSegmentWidget as React.ComponentType<WidgetProps>,
      },
      editorPanels: [
        {
          key: 'wheel-layout',
          label: { vi: 'Bố cục vòng quay', en: 'Wheel layout' },
          Component: CustomWheelPanel,
        },
      ],
    };

    expect(Object.keys(customSurfaces.editorWidgets ?? {})).toEqual(['wheel-segment-picker']);
    expect(customSurfaces.editorPanels?.[0]?.key).toBe('wheel-layout');

    const descriptor: FormDescriptor = {
      groups: ['gameplay'],
      hotEditablePaths: [],
      fields: [
        {
          path: 'segmentLayout',
          key: 'segmentLayout',
          type: 'string',
          widget: 'wheel-segment-picker',
          label: { vi: 'Cấu hình ô', en: 'Segment layout' },
          group: 'gameplay',
          required: true,
          hotEditable: false,
        },
      ],
    };

    const html = renderToStaticMarkup(
      <AutoForm
        descriptor={descriptor}
        value={{ segmentLayout: '6-equal' }}
        onChange={() => {}}
        locale="vi"
        widgets={customSurfaces.editorWidgets}
      />,
    );

    expect(html).toContain('data-testid="surface-custom-widget"');
    expect(html).toContain('6-equal');

    const PanelComp = customSurfaces.editorPanels?.[0]?.Component;
    expect(PanelComp).toBeDefined();
    const panelHtml = PanelComp
      ? renderToStaticMarkup(
          <PanelComp value={{ segmentsCount: 8 }} onChange={() => {}} locale="vi" />,
        )
      : '';
    expect(panelHtml).toContain('data-testid="surface-custom-panel"');
    expect(panelHtml).toContain('Segments:8');
  });
});
