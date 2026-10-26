'use client';

import type { CampaignTemplateKey, PlayResult } from '@playora/contracts';
import { GiftBox } from './gift-box';
import { MECH_KEYFRAMES } from './keyframes';
import type { MechanismLabels } from './labels';
import type { BrandPalette } from './model';
import { ScratchCard } from './scratch-card';
import { SpinWheel } from './spin-wheel';
import type { WheelPrize } from './wheel-math';

/**
 * The template's mechanism, drawn inside the canvas `gameStage` (ADR-014 §1). It never decides
 * an outcome: in play mode it calls `play.onPlay()` (the server), animates towards the returned
 * result, then calls `play.onDone(result)`. Without `play` it renders an idle preview (editor).
 */
export interface MechanismProps {
  mechanism: CampaignTemplateKey;
  brand: BrandPalette;
  prizes: readonly WheelPrize[];
  labels: MechanismLabels;
  play?: {
    onPlay: () => Promise<PlayResult>;
    onDone: (result: PlayResult) => void;
    disabled?: boolean;
  };
}

/**
 * Fills its parent (the stage box) at any size; colours come from the brand palette because
 * this is game content. Remount it (change `key`) to start a fresh round.
 */
export function Mechanism({ mechanism, ...props }: MechanismProps) {
  return (
    <div style={{ width: '100%', height: '100%', userSelect: 'none' }}>
      <style>{MECH_KEYFRAMES}</style>
      {mechanism === 'spin-wheel' ? (
        <SpinWheel {...props} />
      ) : mechanism === 'scratch-card' ? (
        <ScratchCard {...props} />
      ) : (
        <GiftBox {...props} />
      )}
    </div>
  );
}
