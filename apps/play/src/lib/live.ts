export const SPIKE_EVENT = 'spike';
export const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:4001';

export function formatCountdown(endsAt: number | null, now: number) {
  if (!endsAt) return '';
  return `${Math.max(0, Math.ceil((endsAt - now) / 1000))}s`;
}

export {
  clearPlayerSession,
  getOrCreateDeviceId,
  isPlayerTokenValid,
  type PlayerSession,
  readPlayerSession,
  usePlayerSession,
  writePlayerSession,
} from './player-session';
