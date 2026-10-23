import type { ClockReader } from './types';

export interface ClockSample {
  /** Client timestamp (ms) when the ping was sent. */
  t0: number;
  /** Server timestamp (ms) recorded in the pong reply. */
  ts: number;
  /** Client timestamp (ms) when the pong reply was received. */
  t1: number;
}

export function isValidClockSample(sample: ClockSample): boolean {
  return (
    Number.isFinite(sample.t0) &&
    Number.isFinite(sample.ts) &&
    Number.isFinite(sample.t1) &&
    sample.t1 >= sample.t0
  );
}

/** Round-trip time (ms) of a single ping sample. */
export function sampleRtt(sample: ClockSample): number {
  return sample.t1 - sample.t0;
}

/** NTP midpoint clock offset (`server - client` in ms) of a single sample. */
export function sampleOffset(sample: ClockSample): number {
  return sample.ts - (sample.t0 + sample.t1) / 2;
}

/**
 * Estimates `serverNow - clientNow` (in ms) from NTP-style ping samples using median filtering
 * so slow-packet outliers do not skew the countdown clock.
 */
export function estimateClockOffset(samples: readonly ClockSample[]): number {
  const valid = samples.filter(isValidClockSample);
  if (valid.length === 0) return 0;

  const offsets = valid.map(sampleOffset).sort((a, b) => a - b);
  const mid = Math.floor(offsets.length / 2);
  const median =
    offsets.length % 2 === 1
      ? (offsets[mid] ?? 0)
      : ((offsets[mid - 1] ?? 0) + (offsets[mid] ?? 0)) / 2;

  return Math.round(median) || 0;
}

export interface ClockSyncOptions {
  /** Rolling sample window size (default 5, per docs/05-architecture.md §6.3). */
  maxSamples?: number;
  /** Custom client clock source (defaults to `Date.now`). */
  now?: () => number;
}

export interface ClockSync extends ClockReader {
  readonly samples: readonly ClockSample[];
  recordSample(sample: ClockSample): number;
  recordSamples(samples: readonly ClockSample[]): number;
  /** Milliseconds remaining until `deadlineServerMs` (clamped to `>= 0`). */
  remainingMs(deadlineServerMs: number): number;
  reset(): void;
}

export function createClockSync(options?: ClockSyncOptions): ClockSync {
  const maxSamples = Math.max(1, options?.maxSamples ?? 5);
  const clientNow = options?.now ?? Date.now;
  let buffer: ClockSample[] = [];
  let currentOffsetMs = 0;

  const recompute = () => {
    currentOffsetMs = estimateClockOffset(buffer);
    return currentOffsetMs;
  };

  return {
    get offsetMs() {
      return currentOffsetMs;
    },
    get samples() {
      return buffer;
    },
    now(): number {
      return clientNow() + currentOffsetMs;
    },
    recordSample(sample: ClockSample): number {
      if (!isValidClockSample(sample)) return currentOffsetMs;
      buffer.push(sample);
      if (buffer.length > maxSamples) {
        buffer = buffer.slice(buffer.length - maxSamples);
      }
      return recompute();
    },
    recordSamples(newSamples: readonly ClockSample[]): number {
      for (const s of newSamples) {
        if (isValidClockSample(s)) {
          buffer.push(s);
        }
      }
      if (buffer.length > maxSamples) {
        buffer = buffer.slice(buffer.length - maxSamples);
      }
      return recompute();
    },
    remainingMs(deadlineServerMs: number): number {
      return Math.max(0, deadlineServerMs - (clientNow() + currentOffsetMs));
    },
    reset(): void {
      buffer = [];
      currentOffsetMs = 0;
    },
  };
}
