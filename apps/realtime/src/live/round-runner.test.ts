import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test';
import { ErrorCode } from '@playora/contracts';
import { tapRaceConfigSchema, tapRaceServer } from '@playora/game-sdk/examples/tap-race';
import type { PlayerRef } from '@playora/game-sdk/server';
import { mergeGameConfig, resolveTemplateConfig } from '../templates';
import { COUNTDOWN_DURATION_MS, RoundRunner, type RoundTransitionEvent } from './round-runner';

describe('RoundRunner timing & state machine (fake timers)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-24T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createRunner(durationSec = 10) {
    const transitions: RoundTransitionEvent[] = [];
    const players = new Map<string, PlayerRef>([
      ['p1', { playerId: 'p1', displayName: 'An', team: 'Red' }],
      ['p2', { playerId: 'p2', displayName: 'Bình', team: 'Blue' }],
    ]);
    const config = tapRaceConfigSchema.parse({ durationSec });
    const runner = new RoundRunner({
      eventId: 'evt_1',
      roundId: 'rnd_1',
      gameId: 'game_1',
      gameVersionId: 'ver_1',
      templateKey: 'tap-race',
      templateVersion: '1.0.0',
      config,
      module: tapRaceServer,
      players,
      onTransition: (ev) => {
        transitions.push(ev);
      },
    });
    return { runner, transitions, players };
  }

  test('transitions open -> lobby -> countdown (3s) -> playing -> timer.elapsed (durationSec) -> result -> closed', async () => {
    const { runner, transitions } = createRunner(10);
    expect(runner.status).toBe('idle');

    // Open round -> lobby
    const openAck = await runner.open();
    expect(openAck).toEqual({ ok: true });
    expect(runner.status).toBe('lobby');
    expect(transitions.at(-1)?.status).toBe('lobby');

    // Start round -> 3s countdown
    const startTs = Date.now();
    const startAck = await runner.handleCommand({ cmd: 'round.start' });
    expect(startAck).toEqual({ ok: true });
    expect(runner.status).toBe('countdown');
    expect(runner.endsAt).toBe(startTs + COUNTDOWN_DURATION_MS);

    // Inputs during countdown are dropped
    expect(runner.handlePlayerInput('p1', { d: 5 })).toBe(false);

    // 2999ms into countdown: still in countdown
    jest.advanceTimersByTime(2_999);
    expect(runner.status).toBe('countdown');

    // +1ms (3000ms total): transitions to playing with 10s duration timer
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(runner.status).toBe('playing');
    const playingStartTs = Date.now();
    expect(runner.endsAt).toBe(playingStartTs + 10_000);
    expect(transitions.at(-1)).toMatchObject({
      status: 'playing',
      command: 'countdown.elapsed',
    });

    // Player inputs during playing are accepted, validated, and throttled
    expect(runner.handlePlayerInput('p1', { d: 6 })).toBe(true);
    expect(runner.handlePlayerInput('p1', { d: 6 })).toBe(false); // throttled (< 200ms)
    expect(runner.handlePlayerInput('p1', { d: -5 })).toBe(false); // fails actionSchema
    expect(runner.handlePlayerInput('p2', { d: 4 })).toBe(true);

    // Advance 9999ms of playing: still playing
    jest.advanceTimersByTime(9_999);
    expect(runner.status).toBe('playing');

    // +1ms (10000ms total): duration timer fires -> result
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(runner.status).toBe('result');
    expect(runner.lastResult).toEqual({
      roundId: 'rnd_1',
      ranking: [
        { playerId: 'p1', displayName: 'An', score: 6, team: 'Red' },
        { playerId: 'p2', displayName: 'Bình', score: 4, team: 'Blue' },
      ],
      teams: [
        { team: 'Red', score: 6 },
        { team: 'Blue', score: 4 },
      ],
    });

    // round.next -> closed
    const nextAck = await runner.handleCommand({ cmd: 'round.next' });
    expect(nextAck).toEqual({ ok: true });
    expect(runner.status).toBe('closed');
  });

  test('pauses and resumes duration timer while dropping inputs during pause', async () => {
    const { runner } = createRunner(10);
    await runner.open();
    await runner.handleCommand({ cmd: 'round.start' });

    // Finish 3s countdown -> playing (10s remaining)
    jest.advanceTimersByTime(3_000);
    await Promise.resolve();
    expect(runner.status).toBe('playing');

    // Play for 4s (6s remaining)
    jest.advanceTimersByTime(4_000);
    expect(runner.handlePlayerInput('p1', { d: 5 })).toBe(true);

    // Pause
    const pauseAck = await runner.handleCommand({ cmd: 'round.pause' });
    expect(pauseAck).toEqual({ ok: true });
    expect(runner.status).toBe('playing');
    expect(runner.paused).toBe(true);
    expect(runner.endsAt).toBeNull();
    expect(runner.remainingMs).toBe(6_000);

    // Wait 20s while paused: timer must NOT fire and inputs must be dropped
    jest.advanceTimersByTime(20_000);
    expect(runner.status).toBe('playing');
    expect(runner.handlePlayerInput('p1', { d: 5 })).toBe(false);
    expect(runner.toPlayerView('p1').score).toBe(5);

    // Resume via second round.pause
    const resumeTs = Date.now();
    const resumeAck = await runner.handleCommand({ cmd: 'round.pause' });
    expect(resumeAck).toEqual({ ok: true });
    expect(runner.paused).toBe(false);
    expect(runner.endsAt).toBe(resumeTs + 6_000);

    // Inputs work again after resume
    expect(runner.handlePlayerInput('p1', { d: 3 })).toBe(true);
    expect(runner.toPlayerView('p1').score).toBe(8);

    // Advance 5999ms: still playing
    jest.advanceTimersByTime(5_999);
    expect(runner.status).toBe('playing');

    // +1ms (6000ms after resume): transitions to result
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(runner.status).toBe('result');
  });

  test('rejects illegal transitions with CONFLICT ack error', async () => {
    const { runner } = createRunner(10);
    expect(await runner.handleCommand({ cmd: 'round.start' })).toEqual({
      ok: false,
      error: ErrorCode.CONFLICT,
    });

    await runner.open();
    expect(await runner.handleCommand({ cmd: 'round.pause' })).toEqual({
      ok: false,
      error: ErrorCode.CONFLICT,
    });
    expect(await runner.handleCommand({ cmd: 'round.end' })).toEqual({
      ok: false,
      error: ErrorCode.CONFLICT,
    });
  });

  test('merges game_versions.config with games.hotConfig (nested and dot-paths)', () => {
    const base = {
      durationSec: 45,
      copy: {
        title: { vi: 'Gốc', en: 'Original' },
        cta: { vi: 'Cổ vũ' },
      },
    };
    const hot = {
      'copy.title': { vi: 'Đã sửa nóng', en: 'Hot Edited' },
    };
    const merged = mergeGameConfig(base, hot);
    expect(merged).toEqual({
      durationSec: 45,
      copy: {
        title: { vi: 'Đã sửa nóng', en: 'Hot Edited' },
        cta: { vi: 'Cổ vũ' },
      },
    });

    const resolved = resolveTemplateConfig(
      {
        key: 'tap-race',
        version: '1.0.0',
        configSchema: tapRaceConfigSchema,
        server: tapRaceServer,
      },
      base,
      hot,
    );
    expect(resolved.durationSec).toBe(45);
    expect(resolved.copy.title.vi).toBe('Đã sửa nóng');
  });
});
