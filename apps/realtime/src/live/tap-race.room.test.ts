import { describe, expect, test } from 'bun:test';
import { MAX_DELTA_PER_INPUT, TapRaceRoom } from './tap-race.room';

describe('TapRaceRoom', () => {
  test('ignores input outside the playing state', () => {
    const room = new TapRaceRoom();
    room.join('a', 'An', 'Sales');
    expect(room.input('a', 3, 1_000)).toBe(false);
  });

  test('caps each input and rate-limits bursts', () => {
    const room = new TapRaceRoom();
    room.join('a', 'An', 'Sales');
    room.start(60_000, 0);
    expect(room.input('a', 64, 1_000)).toBe(true);
    expect(room.input('a', 5, 1_050)).toBe(false);
    expect(room.input('a', 5, 1_300)).toBe(true);
    expect(room.playerViews(1_300).get('a')?.score).toBe(MAX_DELTA_PER_INPUT + 5);
  });

  test('ranks players and totals teams', () => {
    const room = new TapRaceRoom();
    room.join('a', 'An', 'Sales');
    room.join('b', 'Bình', 'Tech');
    room.join('c', 'Chi', 'Sales');
    room.start(60_000, 0);
    room.input('a', 2, 1_000);
    room.input('b', 5, 1_000);
    room.input('c', 4, 1_000);

    const view = room.screenView(1_000);
    expect(view.top.map((r) => r.name)).toEqual(['Bình', 'Chi', 'An']);
    expect(view.teams).toEqual([
      { team: 'Sales', score: 6 },
      { team: 'Tech', score: 5 },
    ]);
    expect(room.playerViews(1_000).get('a')).toMatchObject({ rank: 3, teamScore: 6 });
  });

  test('moves to result when time is up', () => {
    const room = new TapRaceRoom();
    room.start(1_000, 0);
    expect(room.tick(999)).toBe(false);
    expect(room.tick(1_000)).toBe(true);
    expect(room.status).toBe('result');
  });
});
