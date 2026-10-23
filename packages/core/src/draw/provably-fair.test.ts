import { describe, expect, test } from 'bun:test';
import { commitSeed, createServerSeed, drawWinners, hashPool, verifyDraw } from './provably-fair';

const pool = Array.from({ length: 500 }, (_, i) => `player-${i}`);

describe('provably-fair lucky draw', () => {
  test('is deterministic for the same seed, pool and spin', () => {
    const serverSeed = createServerSeed();
    const a = drawWinners({ serverSeed, poolIds: pool, spinNo: 1, count: 10 });
    const b = drawWinners({ serverSeed, poolIds: [...pool].reverse(), spinNo: 1, count: 10 });
    expect(a).toEqual(b);
  });

  test('never picks the same player twice in one spin', () => {
    const { winners } = drawWinners({
      serverSeed: createServerSeed(),
      poolIds: pool,
      spinNo: 1,
      count: 50,
    });
    expect(new Set(winners).size).toBe(50);
  });

  test('different spins of the same seed give different winners', () => {
    const serverSeed = createServerSeed();
    const first = drawWinners({ serverSeed, poolIds: pool, spinNo: 1, count: 5 }).winners;
    const second = drawWinners({ serverSeed, poolIds: pool, spinNo: 2, count: 5 }).winners;
    expect(first).not.toEqual(second);
  });

  test('pool hash ignores order and duplicates are removed before drawing', () => {
    expect(hashPool(['b', 'a'])).toBe(hashPool(['a', 'b']));
    const { poolSize } = drawWinners({
      serverSeed: createServerSeed(),
      poolIds: ['a', 'a', 'b'],
      spinNo: 1,
      count: 1,
    });
    expect(poolSize).toBe(2);
  });

  test('rejects empty pools and oversized counts', () => {
    const serverSeed = createServerSeed();
    expect(() => drawWinners({ serverSeed, poolIds: [], spinNo: 1, count: 1 })).toThrow(RangeError);
    expect(() => drawWinners({ serverSeed, poolIds: ['a'], spinNo: 1, count: 2 })).toThrow(
      RangeError,
    );
  });

  test('verifyDraw accepts the revealed seed and rejects tampering', () => {
    const serverSeed = createServerSeed();
    const seedCommit = commitSeed(serverSeed);
    const { winners } = drawWinners({ serverSeed, poolIds: pool, spinNo: 3, count: 3 });
    const input = { serverSeed, poolIds: pool, spinNo: 3, count: 3, seedCommit };

    expect(verifyDraw({ ...input, expectedWinners: winners })).toBe(true);
    expect(verifyDraw({ ...input, expectedWinners: [...winners].reverse() })).toBe(false);
    expect(verifyDraw({ ...input, serverSeed: createServerSeed(), expectedWinners: winners })).toBe(
      false,
    );
  });

  test('is roughly uniform across many draws', () => {
    const small = ['a', 'b', 'c', 'd'];
    const counts = new Map<string, number>();
    const serverSeed = createServerSeed();
    for (let spinNo = 0; spinNo < 4000; spinNo++) {
      const [winner] = drawWinners({ serverSeed, poolIds: small, spinNo, count: 1 }).winners;
      counts.set(winner as string, (counts.get(winner as string) ?? 0) + 1);
    }
    for (const id of small) {
      expect(counts.get(id) ?? 0).toBeGreaterThan(850);
      expect(counts.get(id) ?? 0).toBeLessThan(1150);
    }
  });
});
