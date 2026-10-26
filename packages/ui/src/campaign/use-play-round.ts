'use client';

import type { PlayResult } from '@playora/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MechanismProps } from './mechanism';

export type RoundPhase = 'idle' | 'pending' | 'reveal' | 'done';

/**
 * One play round shared by every mechanism: ask the server (`onPlay`) exactly once, expose the
 * result for the animation, then report back (`onDone`). Results that have nothing to animate
 * (`no_turns`, `closed`) are handed back immediately; a failed request returns to idle so the
 * player can try again.
 */
export function usePlayRound(play: MechanismProps['play']) {
  const [phase, setPhase] = useState<RoundPhase>('idle');
  const [result, setResult] = useState<PlayResult | null>(null);
  const busy = useRef(false);
  const playRef = useRef(play);
  playRef.current = play;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const interactive = Boolean(play && !play.disabled) && phase === 'idle';

  const start = useCallback(async (): Promise<PlayResult | null> => {
    const current = playRef.current;
    if (!current || current.disabled || busy.current) return null;
    busy.current = true;
    setPhase('pending');
    try {
      const next = await current.onPlay();
      if (next.outcome === 'no_turns' || next.outcome === 'closed') {
        busy.current = false;
        setPhase('idle');
        current.onDone(next);
        return null;
      }
      setResult(next);
      setPhase('reveal');
      return next;
    } catch {
      busy.current = false;
      setPhase('idle');
      return null;
    }
  }, []);

  /** Reports the result after `delayMs` (the end of the reveal animation). */
  const finish = useCallback((value: PlayResult, delayMs: number) => {
    timers.current.push(
      setTimeout(() => {
        setPhase('done');
        playRef.current?.onDone(value);
      }, delayMs),
    );
  }, []);

  return { phase, result, interactive, start, finish };
}

/** `prefers-reduced-motion: reduce`, live. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
