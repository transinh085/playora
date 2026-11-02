'use client';

import type { PlayResult } from '@playora/contracts';
import type { PlayOutcome, PlaySession } from '@playora/game-sdk';
import {
  CatchItemsPlayer,
  type CatchItemsSubmission,
  catchItemsTemplate,
} from '@playora/templates';
import type { MechanismProps } from '@playora/ui/campaign';
import { useMemo, useRef, useState } from 'react';

export function CatchItemsStage({ brand, play }: MechanismProps) {
  const [sessionState, setSessionState] = useState<'ready' | 'playing' | 'done'>('ready');
  const [result, setResult] = useState<{ outcome: PlayOutcome; display: undefined } | null>(null);
  const pendingResultRef = useRef<PlayResult | null>(null);
  const doneCalledRef = useRef(false);

  const session: PlaySession<undefined, CatchItemsSubmission> = useMemo(
    () => ({
      state: sessionState,
      remaining: { today: null, total: null },
      async start() {
        setSessionState('playing');
        doneCalledRef.current = false;
      },
      async submit(_sub: CatchItemsSubmission) {
        if (!play) return;
        try {
          const res = await play.onPlay();
          pendingResultRef.current = res;
          const outcome: PlayOutcome =
            res.outcome === 'win' && res.prize
              ? {
                  kind: 'win',
                  prize: {
                    id: res.prize.id,
                    name: { vi: res.prize.name },
                    type: 'voucher_code',
                    imageUrl: res.prize.image,
                  },
                  voucherCode: res.voucher?.code,
                }
              : { kind: 'lose' };

          setResult({ outcome, display: undefined });
          setSessionState('done');

          // Automatically hand over to CampaignPlayer's resultWin / resultLose screen (like spin-wheel)!
          setTimeout(() => {
            if (!doneCalledRef.current && play) {
              doneCalledRef.current = true;
              play.onDone(res);
            }
          }, 600);
        } catch {
          setSessionState('ready');
        }
      },
      result,
    }),
    [sessionState, result, play],
  );

  return (
    <div className="h-full w-full">
      <CatchItemsPlayer
        config={catchItemsTemplate.defaultConfig}
        brand={{
          colors: {
            primary: brand.primary,
            accent: brand.accent,
            background: brand.background,
            text: brand.text,
          },
        }}
        assets={{ url: () => undefined, all: {} }}
        locale="vi"
        quality="high"
        session={session}
        onFinished={() => {
          const pending = pendingResultRef.current;
          if (pending && play && !doneCalledRef.current) {
            doneCalledRef.current = true;
            play.onDone(pending);
          }
        }}
      />
    </div>
  );
}
