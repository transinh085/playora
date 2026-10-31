import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Countdown,
  formatSeconds,
  GameButton,
  GameResult,
  GameRoot,
  JoinPanel,
  Leaderboard,
  TeamBar,
} from './index';

describe('@playora/ui/game components', () => {
  test('GameRoot wraps PlayProvider, applies data-skin and --game-* brand vars, and supports asChild', () => {
    const html = renderToStaticMarkup(
      <GameRoot
        skin="tet"
        brand={{ primary: '#ffd400', background: '#101010', radius: 'soft' }}
        data-testid="root"
      >
        <GameButton variant="primary" size="lg" data-testid="btn">
          Quay ngay
        </GameButton>
      </GameRoot>,
    );

    expect(html).toContain('data-slot="game-root"');
    expect(html).toContain('data-skin="tet"');
    expect(html).toContain('--game-primary:#ffd400');
    expect(html).toContain('--game-bg:#101010');
    expect(html).toContain('data-slot="game-button"');
    expect(html).toContain('data-variant="primary"');
    expect(html).toContain('data-size="lg"');

    const asChildHtml = renderToStaticMarkup(
      <GameRoot asChild skin="yep">
        <main className="custom-main">Hello</main>
      </GameRoot>,
    );
    expect(asChildHtml).toContain('<main');
    expect(asChildHtml).toContain('data-slot="game-root"');
    expect(asChildHtml).toContain('data-skin="yep"');
    expect(asChildHtml).toContain('custom-main');
  });

  test('Countdown, JoinPanel, Leaderboard, TeamBar and GameResult render properly', () => {
    expect(formatSeconds(65)).toBe('1:05');
    expect(formatSeconds(4.2)).toBe('5');

    const html = renderToStaticMarkup(
      <GameRoot skin="classic">
        <JoinPanel url="play.playora.vn/yep" code="4821" qr={<span>QR</span>} />
        <Countdown seconds={4} urgentAt={5} />
        <TeamBar name="Marketing" score={2210} max={2500} team={2} leading />
        <Leaderboard
          highlightId="p2"
          entries={[
            { id: 'p1', name: 'Nhung', score: 412, meta: 'Marketing' },
            { id: 'p2', name: 'Bảo', score: 398, meta: 'Sales' },
          ]}
        />
        <GameResult
          data-testid="spin-wheel-result"
          outcome="win"
          title="Giải Nhất"
          description="Ô số 1"
        />
      </GameRoot>,
    );

    expect(html).toContain('data-slot="join-panel"');
    expect(html).toContain('4821');
    expect(html).toContain('data-slot="countdown"');
    expect(html).toContain('data-urgent="true"');
    expect(html).toContain('data-slot="team-bar"');
    expect(html).toContain('data-leading="true"');
    expect(html).toContain('data-slot="leaderboard"');
    expect(html).toContain('data-me="true"');
    expect(html).toContain('data-slot="game-result"');
    expect(html).toContain('data-outcome="win"');
  });
});
