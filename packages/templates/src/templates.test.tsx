import { describe, expect, test } from 'bun:test';
import { createPreviewSession, resolveTemplateAssets } from '@playora/game-sdk';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  catchItemsServer,
  catchItemsTemplate,
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
  test('every registry entry has surfaces (id@version -> { Player }) and a server module, and getTemplate returns the identical schema object from client and server entries', async () => {
    expect(registryTemplates.length).toBeGreaterThanOrEqual(1);
    expect(templates).toBe(registryTemplates);
    expect(serverTemplates).toBe(registryTemplates);

    for (const entry of registryTemplates) {
      const key = `${entry.id}@${entry.version}`;
      const entrySurfaces = surfaces[key];
      expect(entrySurfaces).toBeDefined();
      expect(entrySurfaces?.Player).toBeDefined();
      expect((entrySurfaces?.Player as { $$typeof?: symbol })?.$$typeof).toBe(
        Symbol.for('react.lazy'),
      );
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
    const spinWheelSurface = surfaces['spin-wheel@1.0.0'];
    expect(spinWheelSurface?.Player).toBeDefined();
    expect((spinWheelSurface?.Player as { $$typeof?: symbol })?.$$typeof).toBe(
      Symbol.for('react.lazy'),
    );
    const lazyPayload = (
      spinWheelSurface?.Player as
        | { _payload?: { _result?: () => Promise<{ default: unknown }> } }
        | undefined
    )?._payload;
    if (lazyPayload?._result) {
      const loaded = await lazyPayload._result();
      expect(loaded.default).toBe(SpinWheelPlayer);
    }

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

  test('catchItemsServer validates duration and theoretical score limit, and qualifies threshold', () => {
    const config = catchItemsTemplate.defaultConfig;

    // 1. Duration too short (< 27s for 30s config)
    const tooFast = catchItemsServer.validate(
      { score: 100, durationMs: 15000, itemsCaught: 10, bombsHit: 0 },
      { config, startedAt: 0, endedAt: 30000 },
    );
    expect(tooFast.ok).toBe(false);
    if (!tooFast.ok) {
      expect(tooFast.reason).toBe('duration_too_short');
    }

    // 2. Score exceeds maximum theoretical limit (e.g. 9999 pts in 30s)
    const cheat = catchItemsServer.validate(
      { score: 9999, durationMs: 30000, itemsCaught: 999, bombsHit: 0 },
      { config, startedAt: 0, endedAt: 30000 },
    );
    expect(cheat.ok).toBe(false);
    if (!cheat.ok) {
      expect(cheat.reason).toBe('score_exceeds_theoretical_limit');
    }

    // 3. Valid normal play
    const valid = catchItemsServer.validate(
      { score: 120, durationMs: 30000, itemsCaught: 12, bombsHit: 0 },
      { config, startedAt: 0, endedAt: 30000 },
    );
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.score).toBe(120);
    }

    // 4. Threshold qualifying
    expect(catchItemsServer.qualifies(120, config)).toBe(true);
    expect(catchItemsServer.qualifies(80, config)).toBe(false);
  });

  test('createPreviewSession works seamlessly with skill template catch-items', async () => {
    const session = createPreviewSession({
      template: catchItemsTemplate,
      outcome: {
        kind: 'win',
        prize: { id: 'prize-tea', name: { vi: 'Ly Trà Sữa 0đ' }, type: 'voucher_code' },
      },
      startedAt: 0,
      endedAt: 30000,
    });

    expect(session.state).toBe('ready');
    await session.start();
    expect(session.state).toBe('playing');

    // Submit winning score >= 100
    await session.submit({
      score: 150,
      durationMs: 30000,
      itemsCaught: 15,
      bombsHit: 0,
    });

    expect(session.state).toBe('done');
    expect(session.result?.outcome.kind).toBe('win');

    // Fresh session submitting losing score < 100
    const loseSession = createPreviewSession({
      template: catchItemsTemplate,
      outcome: {
        kind: 'win',
        prize: { id: 'prize-tea', name: { vi: 'Ly Trà Sữa 0đ' }, type: 'voucher_code' },
      },
      startedAt: 0,
      endedAt: 30000,
    });
    await loseSession.start();
    await loseSession.submit({
      score: 60,
      durationMs: 30000,
      itemsCaught: 6,
      bombsHit: 0,
    });
    expect(loseSession.state).toBe('done');
    expect(loseSession.result?.outcome.kind).toBe('lose');
  });
});
