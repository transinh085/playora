import { describe, expect, test } from 'bun:test';
import { resolveTemplateAssets } from '@playora/game-sdk';
import { createTestRoom } from '@playora/game-sdk/server';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getTemplate,
  getTemplateSurfaces,
  surfaces,
  TapRacePlayer,
  TapRaceScreen,
  tapRaceTemplate,
  templates,
} from './index';
import { templates as registryTemplates } from './registry';
import {
  getServerModule,
  getTemplate as getServerTemplate,
  templates as serverTemplates,
} from './server';

describe('@playora/templates registry', () => {
  test('every registry entry has surfaces (id@version -> { Player, Screen }) and a server module, and getTemplate returns the identical schema object from client and server entries', () => {
    expect(registryTemplates.length).toBeGreaterThanOrEqual(1);
    expect(templates).toBe(registryTemplates);
    expect(serverTemplates).toBe(registryTemplates);

    for (const entry of registryTemplates) {
      const key = `${entry.id}@${entry.version}`;
      const entrySurfaces = surfaces[key];
      expect(entrySurfaces).toBeDefined();
      expect(typeof entrySurfaces?.Player).toBe('function');
      expect(typeof entrySurfaces?.Screen).toBe('function');
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

    const tpl = getTemplate('tap-race');
    expect(tpl).toBeDefined();
    expect(tpl?.id).toBe('tap-race');
    expect(tpl?.version).toBe('1.0.0');
    expect(tpl?.kind).toBe('live');
    expect(tpl?.skins.map((s) => s.key)).toEqual(['yep', 'tet']);
    expect(surfaces['tap-race@1.0.0']?.Player).toBe(TapRacePlayer);
    expect(surfaces['tap-race@1.0.0']?.Screen).toBe(TapRaceScreen);

    expect(getTemplate('tap-race', '1.0.0')).toBe(tpl);
    expect(getTemplate('tap-race', '9.9.9')).toBeUndefined();
    expect(getTemplate('unknown-game')).toBeUndefined();
    expect(getServerModule('tap-race', '2.0.0')).toBeUndefined();
  });

  test('renders TapRacePlayer and TapRaceScreen surfaces with @playora/ui game components', () => {
    const room = createTestRoom(tapRaceTemplate);
    room.join('p1', 'Nguyễn An', 'Đội Đỏ');
    room.join('p2', 'Trần Bình', 'Đội Xanh');
    room.command({ cmd: 'round.start' });
    room.command({ cmd: 'countdown.elapsed' });
    room.setNow(1_000);
    room.action('p1', { d: 5 });
    room.action('p2', { d: 3 });

    const brand = {
      colors: { primary: '#7c3aed', background: '#0f0a1e', text: '#ffffff' },
    };
    const assets = resolveTemplateAssets(tapRaceTemplate, { skinKey: 'yep', brand });
    const clock = { now: () => room.now(), offsetMs: 0 };

    const playerHtml = renderToStaticMarkup(
      <TapRacePlayer
        config={room.config}
        brand={brand}
        assets={assets}
        skin="yep"
        status={room.status}
        state={room.playerView('p1')}
        clock={clock}
        locale="vi"
        quality="high"
        player={{ playerId: 'p1', displayName: 'Nguyễn An', team: 'Đội Đỏ' }}
        send={() => {}}
      />,
    );

    expect(playerHtml).toContain('data-slot="game-root"');
    expect(playerHtml).toContain('data-slot="game-button"');
    expect(playerHtml).toContain('data-slot="countdown"');
    expect(playerHtml).toContain('Đua chạm tốc độ');
    expect(playerHtml).toContain('CHẠM!');

    const screenHtml = renderToStaticMarkup(
      <TapRaceScreen
        config={room.config}
        brand={brand}
        assets={assets}
        skin="tet"
        status={room.status}
        state={room.screenView()}
        clock={clock}
        locale="vi"
        quality="high"
      />,
    );

    expect(screenHtml).toContain('data-slot="stage"');
    expect(screenHtml).toContain('data-slot="team-bar"');
    expect(screenHtml).toContain('data-slot="leaderboard"');
    expect(screenHtml).toContain('data-slot="countdown"');
    expect(screenHtml).toContain('Nguyễn An');
    expect(screenHtml).toContain('Đội Đỏ');
  });
});
