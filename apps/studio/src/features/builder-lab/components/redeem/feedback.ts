'use client';

export type RedeemFeedbackKind = 'valid' | 'invalid' | 'redeemed';

/**
 * Plays a distinct Web Audio tone + haptic vibration pattern at the counter (PRZ-10):
 * - `valid`: bright ascending chime + short crisp vibration `[60]`
 * - `redeemed`: double confirmation chime + `[80, 40, 120]`
 * - `invalid`: low warning buzz + `[180, 60, 180]`
 */
export function playRedeemFeedback(kind: RedeemFeedbackKind) {
  if (typeof window === 'undefined') return;

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (kind === 'valid') navigator.vibrate([60]);
      else if (kind === 'redeemed') navigator.vibrate([80, 40, 120]);
      else navigator.vibrate([180, 60, 180]);
    }
  } catch {
    // Ignore vibration errors on unsupported browsers
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      type: OscillatorType,
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.14, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    if (kind === 'valid') {
      playTone(880, 0, 0.12, 'sine');
      playTone(1174.66, 0.1, 0.18, 'sine');
    } else if (kind === 'redeemed') {
      playTone(987.77, 0, 0.1, 'sine');
      playTone(1318.51, 0.09, 0.22, 'sine');
    } else {
      playTone(220, 0, 0.18, 'sawtooth');
      playTone(180, 0.2, 0.22, 'sawtooth');
    }

    window.setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 600);
  } catch {
    // AudioContext blocked or unavailable in test environments
  }
}
