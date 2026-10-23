import { describe, expect, test } from 'bun:test';
import { ZodError } from 'zod';
import { createTestRoom, transitionRound } from '../../harness';
import { TAP_RACE_MAX_DELTA_PER_INPUT, tapRaceTemplate } from './index';

describe('transitionRound state machine', () => {
  test('follows docs/07-api-realtime.md §4.3 transitions and rejects illegal transitions', () => {
    expect(transitionRound('idle', 'round.open')).toBe('lobby');
    expect(transitionRound('idle', 'round.start')).toBeNull();

    expect(transitionRound('lobby', 'round.start')).toBe('countdown');
    expect(transitionRound('lobby', 'round.pause')).toBeNull();
    expect(transitionRound('lobby', 'round.end')).toBeNull();

    expect(transitionRound('countdown', 'countdown.elapsed')).toBe('playing');
    expect(transitionRound('countdown', 'round.end')).toBeNull();

    expect(transitionRound('playing', 'round.pause')).toBe('playing');
    expect(transitionRound('playing', 'round.end')).toBe('result');
    expect(transitionRound('playing', 'timer.elapsed')).toBe('result');
    expect(transitionRound('playing', 'round.next')).toBeNull();

    expect(transitionRound('result', 'round.next')).toBe('closed');
    expect(transitionRound('result', 'round.open')).toBeNull();

    expect(transitionRound('closed', 'round.open')).toBeNull();
    expect(transitionRound('closed', 'round.start')).toBeNull();
  });
});

describe('tap-race example template with createTestRoom harness', () => {
  test('ignores player actions outside the playing state', () => {
    const room = createTestRoom(tapRaceTemplate);
    room.join('a', 'An', 'Sales');
    expect(room.status).toBe('lobby');

    room.action('a', { d: 5 });
    expect(room.playerView('a').score).toBe(0);
  });

  test('drops lobby leavers but preserves scores when leaving during play', () => {
    const room = createTestRoom(tapRaceTemplate);
    room.join('a', 'An', 'Sales');
    room.join('b', 'Bình', 'Tech');
    room.leave('b');
    expect(room.screenView().online).toBe(1);
    expect(room.players.has('b')).toBe(false);

    room.command({ cmd: 'round.start' });
    room.command({ cmd: 'countdown.elapsed' });
    room.tick(1_000);
    room.action('a', { d: 6 });
    room.leave('a');

    expect(room.players.has('a')).toBe(true);
    expect(room.playerView('a').score).toBe(6);
    expect(room.screenView().online).toBe(1);
  });

  test('toggles paused flag on round.pause while playing and throws on illegal transitions', () => {
    const room = createTestRoom(tapRaceTemplate, undefined, { status: 'idle' });
    expect(() => room.command({ cmd: 'round.start' })).toThrow(/Illegal round transition/);

    room.command({ cmd: 'round.open', gameId: 'tap-race' });
    expect(room.status).toBe('lobby');
    expect(() => room.command({ cmd: 'round.pause' })).toThrow(/Illegal round transition/);

    room.join('a', 'An', 'Sales');
    room.command({ cmd: 'round.start' });
    expect(room.status).toBe('countdown');

    room.command({ cmd: 'countdown.elapsed' });
    expect(room.status).toBe('playing');
    expect(room.paused).toBe(false);

    // Pause via round.pause
    room.command({ cmd: 'round.pause' });
    expect(room.status).toBe('playing');
    expect(room.paused).toBe(true);

    // Actions while paused are ignored
    room.setNow(1_000);
    room.action('a', { d: 5 });
    expect(room.playerView('a').score).toBe(0);

    // Resume via round.pause toggle
    room.command({ cmd: 'round.pause' });
    expect(room.status).toBe('playing');
    expect(room.paused).toBe(false);

    room.action('a', { d: 5 });
    expect(room.playerView('a').score).toBe(5);
  });

  test('caps each input at maxDeltaPerInput and rate-limits rapid bursts', () => {
    const room = createTestRoom(tapRaceTemplate, { durationSec: 60 });
    room.join('a', 'An', 'Sales');
    room.command({ cmd: 'round.start' });
    room.command({ cmd: 'countdown.elapsed' });

    // t = 1000ms: delta 64 is capped at TAP_RACE_MAX_DELTA_PER_INPUT (8)
    room.setNow(1_000);
    room.action('a', { d: 64 });
    expect(room.playerView('a').score).toBe(TAP_RACE_MAX_DELTA_PER_INPUT);

    // t = 1050ms (< 200ms interval): dropped
    room.setNow(1_050);
    room.action('a', { d: 5 });
    expect(room.playerView('a').score).toBe(TAP_RACE_MAX_DELTA_PER_INPUT);

    // t = 1300ms (>= 200ms interval): accepted
    room.setNow(1_300);
    room.action('a', { d: 5 });
    expect(room.playerView('a').score).toBe(TAP_RACE_MAX_DELTA_PER_INPUT + 5);
  });

  test('validates player actions against actionSchema', () => {
    const room = createTestRoom(tapRaceTemplate);
    room.join('a', 'An', 'Sales');
    room.command({ cmd: 'round.start' });
    room.command({ cmd: 'countdown.elapsed' });

    expect(() => room.action('a', { d: -1 })).toThrow(ZodError);
    expect(() => room.action('a', { d: 100 })).toThrow(ZodError);
  });

  test('ranks players, aggregates team scores, transitions to result on tick, and closes on round.next', () => {
    const room = createTestRoom(tapRaceTemplate, { durationSec: 10 });
    room.join('a', 'An', 'Sales');
    room.join('b', 'Bình', 'Tech');
    room.join('c', 'Chi', 'Sales');

    room.command({ cmd: 'round.start' });
    expect(room.status).toBe('countdown');
    room.command({ cmd: 'countdown.elapsed' });
    expect(room.status).toBe('playing');

    room.tick(1_000);
    room.action('a', { d: 2 });
    room.action('b', { d: 5 });
    room.action('c', { d: 4 });

    const screen = room.screenView();
    expect(screen.top.map((r) => r.name)).toEqual(['Bình', 'Chi', 'An']);
    expect(screen.teams).toEqual([
      { team: 'Sales', score: 6 },
      { team: 'Tech', score: 5 },
    ]);

    expect(room.playerView('a')).toMatchObject({ rank: 3, score: 2, teamScore: 6 });
    expect(room.playerView('b')).toMatchObject({ rank: 1, score: 5, teamScore: 5 });
    expect(room.playerView('c')).toMatchObject({ rank: 2, score: 4, teamScore: 6 });

    // Advance to 9999ms (1ms before 10s duration ends)
    room.tick(8_999);
    expect(room.status).toBe('playing');

    // Advance 1ms more to reach 10_000ms -> transitions to 'result'
    room.tick(1);
    expect(room.status).toBe('result');

    const result = room.finalize();
    expect(result).toEqual({
      ranking: [
        { playerId: 'b', score: 5, team: 'Tech' },
        { playerId: 'c', score: 4, team: 'Sales' },
        { playerId: 'a', score: 2, team: 'Sales' },
      ],
      teams: [
        { team: 'Sales', score: 6 },
        { team: 'Tech', score: 5 },
      ],
    });

    // Advance via round.next -> closed
    room.command({ cmd: 'round.next' });
    expect(room.status).toBe('closed');
  });
});
