import type { RoundStatus } from '@playora/contracts';

/** Mirrors apps/realtime/src/live/tap-race.room.ts for the M0 spike. */
export interface ScreenView {
  status: RoundStatus;
  online: number;
  endsAt: number | null;
  top: Array<{ id: string; name: string; team: string; score: number }>;
  teams: Array<{ team: string; score: number }>;
  serverTs: number;
}

export interface PlayerView {
  status: RoundStatus;
  endsAt: number | null;
  score: number;
  rank: number;
  teamScore: number;
  serverTs: number;
}

export const TEAMS = ['Kinh doanh', 'Marketing', 'Kỹ thuật', 'Vận hành'];
