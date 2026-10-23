import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * Commit–reveal lucky draw.
 *
 * 1. Before spinning, the server creates a secret `serverSeed` and publishes `commitSeed(serverSeed)`.
 * 2. The candidate pool is frozen and fingerprinted with `hashPool(playerIds)`.
 * 3. Winners are derived deterministically from (serverSeed, poolHash, spinNo).
 * 4. After the event the seed is revealed so anyone can re-run `drawWinners` and compare.
 */

export function createServerSeed(): string {
  return randomBytes(32).toString('hex');
}

export function commitSeed(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex');
}

/** Order-independent fingerprint of the candidate pool. */
export function hashPool(playerIds: readonly string[]): string {
  return createHash('sha256')
    .update([...playerIds].sort().join('\n'))
    .digest('hex');
}

export interface DrawInput {
  serverSeed: string;
  poolIds: readonly string[];
  spinNo: number;
  count: number;
}

export interface DrawResult {
  winners: string[];
  poolHash: string;
  poolSize: number;
}

export function drawWinners({ serverSeed, poolIds, spinNo, count }: DrawInput): DrawResult {
  const pool = [...new Set(poolIds)].sort();
  if (pool.length === 0) throw new RangeError('Draw pool is empty');
  if (!Number.isInteger(count) || count < 1)
    throw new RangeError('count must be a positive integer');
  if (count > pool.length)
    throw new RangeError(`count (${count}) exceeds pool size (${pool.length})`);

  const poolHash = hashPool(pool);
  const winners: string[] = [];
  for (let i = 0; i < count; i++) {
    const digest = createHmac('sha256', serverSeed).update(`${poolHash}:${spinNo}:${i}`).digest();
    // 64 bits of entropy against pools of at most a few hundred thousand: modulo bias is negligible.
    const index = Number(digest.readBigUInt64BE(0) % BigInt(pool.length));
    const [winner] = pool.splice(index, 1);
    winners.push(winner as string);
  }
  return { winners, poolHash, poolSize: winners.length + pool.length };
}

export interface VerifyInput extends DrawInput {
  seedCommit: string;
  expectedWinners: readonly string[];
}

export function verifyDraw({ seedCommit, expectedWinners, ...input }: VerifyInput): boolean {
  if (commitSeed(input.serverSeed) !== seedCommit) return false;
  const { winners } = drawWinners(input);
  return (
    winners.length === expectedWinners.length && winners.every((id, i) => id === expectedWinners[i])
  );
}
