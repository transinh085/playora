/**
 * Builder Lab data model (docs/15). Shaped like the future API contracts so the mock in
 * `./api.ts` can be swapped for `@playora/api-client` calls without touching the UI.
 */
import type { PrizeMode } from '@playora/core/prize';
import type { BrandPalette, CanvasDoc } from '@/features/canvas-editor/lib/model';

export type TemplateKey = 'spin-wheel' | 'scratch-card' | 'gift-box';
export type MechanismKey = TemplateKey;
export type SkinKey = 'tet' | 'grand-opening' | 'everyday';
export type Industry = 'fnb' | 'beauty' | 'retail' | 'fitness';
export type Occasion = 'tet' | 'opening' | 'everyday';

export interface SkinInfo {
  key: SkinKey;
  occasion: Occasion;
  brand: BrandPalette;
}

export interface TemplateInfo {
  key: TemplateKey;
  mechanism: MechanismKey;
  industries: Industry[];
  skins: SkinInfo[];
}

export interface LabPrize {
  id: string;
  name: string;
  /** Data URL or preset sticker src. */
  image?: string;
  quantity: number;
  valueVnd: number;
  /** Only used in `per_prize_probability` mode (0..1). */
  probability?: number;
}

export interface LabRules {
  mode: PrizeMode;
  /** `overall_win_rate` mode (0..1). */
  overallWinRate: number;
  /** Participation: plays each player gets per day. */
  playsPerDay: number;
  /** Award limit: prizes one player can win over the whole campaign. */
  maxWinsPerPlayer: number;
  startsAt: string;
  endsAt: string;
  /** Daily opening hours `HH:mm`; null = all day. */
  openingHours: { start: string; end: string } | null;
  /** Spread prizes evenly over the campaign (`time_uniform` pacing). */
  pacing: boolean;
  budgetVnd: number | null;
  /** Show the Form screen before the game. */
  collectForm: boolean;
}

export type CampaignStatus = 'draft' | 'published';

export interface Campaign {
  id: string;
  /** Owning organization. Lab data created before org scoping has none and shows everywhere. */
  orgId?: string;
  name: string;
  templateKey: TemplateKey;
  skinKey: SkinKey;
  brand: BrandPalette;
  screens: CanvasDoc;
  prizes: LabPrize[];
  rules: LabRules;
  status: CampaignStatus;
  /** Organizer paused a published campaign; plays are closed until resumed. */
  paused?: boolean;
  /** Last published version number; 0 = never published. */
  version: number;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export type PlayOutcome = 'win' | 'lose' | 'no_turns' | 'closed';

export interface PlayRecord {
  id: string;
  campaignId: string;
  playerId: string;
  rehearsal: boolean;
  at: string;
  outcome: PlayOutcome;
  /** Prize engine reason (`win`, `lose`, `paced`, `out_of_stock`, `limit`, `budget`, `closed`). */
  reason: string;
  prizeId: string | null;
  voucherCode: string | null;
}

export interface Voucher {
  code: string;
  campaignId: string;
  prizeId: string;
  playerId: string;
  rehearsal: boolean;
  issuedAt: string;
  redeemedAt: string | null;
}

export interface PlayResult {
  outcome: PlayOutcome;
  reason: string;
  prize: LabPrize | null;
  voucherCode: string | null;
  turnsLeftToday: number;
}

export interface CampaignStats {
  plays: number;
  players: number;
  wins: number;
  redeemed: number;
  budgetUsedVnd: number;
  remainingByPrize: Record<string, number>;
}
