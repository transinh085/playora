import { describe, expect, test } from 'bun:test';
import { createPreviewSession, resolveTemplateAssets } from '@playora/game-sdk';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getTemplate,
  getTemplateSurfaces,
  SpinWheelPlayer,
  spinWheelServer,
  spinWheelTemplate,
  surfaces,
  templates,
} from './index';
import { templates as registryTemplates } from './registry';
import {
  getServerModule,
  getTemplate as getServerTemplate,
  templates as serverTemplates,
} from './server';

describe('@playora/templates registry', () => {
  test('every registry entry has surfaces (id@version -> { Player }) and a server module, and getTemplate returns the identical schema object from client and server entries', () => {
    expect(registryTemplates.length).toBeGreaterThanOrEqual(1);
    expect(templates).toBe(registryTemplates);
    expect(serverTemplates).toBe(registryTemplates);

    for (const entry of registryTemplates) {
      const key = `${entry.id}@${entry.version}`;
      const entrySurfaces = surfaces[key];
      expect(entrySurfaces).toBeDefined();
      expect(typeof entrySurfaces?.Player).toBe('function');
      expect(getTemplateSurfaces(entry.id, entry.version)).toBe(entrySurfaces);

      expect(entry.server).toBeDefined();
      expect(getServerModule(entry.id)).toBeDefined();
      expect(getServerModule(entry.id, entry.version)).toBeDefined();

      const fromClient = getTemplate(entry.id, entry.version);
      const fromServer = getServerTemplate(entry.id, entry.version);
      expect(fromClient).toBeDefined();
      expect(fromClient).toBe(fromServer);
      expect(fromClient?.configSchema).toBe(fromServer?.configSchema);
    }

    const tpl = getTemplate('spin-wheel');
    expect(tpl).toBeDefined();
    expect(tpl?.id).toBe('spin-wheel');
    expect(tpl?.version).toBe('1.0.0');
    expect(tpl?.kind).toBe('instant');
    expect(tpl?.skins.map((s) => s.key)).toEqual(['chung', 'tet']);
    expect(surfaces['spin-wheel@1.0.0']?.Player).toBe(SpinWheelPlayer);

    expect(getTemplate('spin-wheel', '1.0.0')).toBe(tpl);
    expect(getTemplate('spin-wheel', '9.9.9')).toBeUndefined();
    expect(getTemplate('unknown-game')).toBeUndefined();
    expect(getServerModule('spin-wheel', '2.0.0')).toBeUndefined();
  });

  test('spinWheelServer.present maps win, lose, and out_of_stock outcomes to matching wheel segments', () => {
    const config = spinWheelTemplate.defaultConfig;

    const winExact = spinWheelServer.present(
      {
        kind: 'win',
        prize: { id: 'prize-2', name: { vi: 'Giải Nhì' }, type: 'physical' },
      },
      config,
      () => 0,
    );
    expect(winExact.segmentIndex).toBe(2);
    expect(config.segments[winExact.segmentIndex]?.prizeSlot).toBe('prize-2');

    const winFallbackPrize = spinWheelServer.present(
      {
        kind: 'win',
        prize: { id: 'sample-prize', name: { vi: 'Giải mẫu' }, type: 'voucher_code' },
      },
      config,
      () => 0,
    );
    expect(config.segments[winFallbackPrize.segmentIndex]?.prizeSlot).not.toBe('none');

    const loseDisplay = spinWheelServer.present({ kind: 'lose' }, config, () => 0);
    expect(config.segments[loseDisplay.segmentIndex]?.prizeSlot).toBe('none');

    const oosDisplay = spinWheelServer.present({ kind: 'out_of_stock' }, config, () => 0.99);
    expect(config.segments[oosDisplay.segmentIndex]?.prizeSlot).toBe('none');
  });

  test('renders SpinWheelPlayer with @playora/ui game components and createPreviewSession', async () => {
    const session = createPreviewSession({
      template: spinWheelTemplate,
      outcome: {
        kind: 'win',
        prize: { id: 'prize-1', name: { vi: 'Giải Nhất' }, type: 'physical' },
      },
      rng: () => 0,
    });

    await session.start();

    const brand = {
      colors: { primary: '#7c3aed', background: '#0f0a1e', text: '#ffffff' },
    };
    const assets = resolveTemplateAssets(spinWheelTemplate, { skinKey: 'chung', brand });

    const playerHtml = renderToStaticMarkup(
      <SpinWheelPlayer
        config={spinWheelTemplate.defaultConfig}
        brand={brand}
        assets={assets}
        skin="chung"
        locale="vi"
        quality="high"
        session={session}
        onFinished={() => {}}
      />,
    );

    expect(playerHtml).toContain('data-testid="spin-wheel-player"');
    expect(playerHtml).toContain('data-slot="game-root"');
    expect(playerHtml).toContain('data-slot="game-button"');
    expect(playerHtml).toContain('data-testid="spin-wheel-start"');
    expect(playerHtml).toContain('data-testid="spin-wheel-result"');
    expect(playerHtml).toContain('Vòng quay may mắn');
    expect(playerHtml).toContain('Quay ngay');
    expect(playerHtml).toContain('Giải Nhất');
  });
});
