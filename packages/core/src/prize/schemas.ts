import { z } from 'zod';

const PROBABILITY_EPSILON = 1e-9;

export const PrizeMode = z.enum(['per_prize_probability', 'overall_win_rate', 'guaranteed']);
export type PrizeMode = z.infer<typeof PrizeMode>;

export const PacingStrategy = z.enum(['none', 'time_uniform']);
export type PacingStrategy = z.infer<typeof PacingStrategy>;

export const DecisionReason = z.enum([
  'win',
  'lose',
  'out_of_stock',
  'limit',
  'budget',
  'paced',
  'closed',
]);
export type DecisionReason = z.infer<typeof DecisionReason>;

export const DecisionResult = z.object({
  prizeId: z.string().nullable(),
  reason: DecisionReason,
});
export type DecisionResult = z.infer<typeof DecisionResult>;

export const PrizeRuleItem = z
  .object({
    id: z.string().trim().min(1),
    quantity: z.number().int().min(0),
    remaining: z.number().int().min(0).optional(),
    valueVnd: z.number().int().min(0).optional(),
    probability: z.number().min(0).max(1).optional(),
    weight: z.number().min(0).optional(),
    sortOrder: z.number().int().optional(),
  })
  .transform((item) => ({
    ...item,
    remaining: item.remaining ?? item.quantity,
  }))
  .refine((item) => item.remaining <= item.quantity, {
    message: 'Prize remaining stock cannot exceed initial quantity',
    path: ['remaining'],
  });
export type PrizeRuleItem = z.output<typeof PrizeRuleItem>;
export type PrizeRuleItemInput = z.input<typeof PrizeRuleItem>;

export const PrizeLimits = z.object({
  perPlayerTotal: z.number().int().min(1).optional(),
  perPlayerPerDay: z.number().int().min(1).optional(),
  perPrizePerPlayer: z
    .union([z.number().int().min(1), z.record(z.string(), z.number().int().min(1))])
    .optional(),
});
export type PrizeLimits = z.infer<typeof PrizeLimits>;

export const PrizePacing = z.object({
  strategy: PacingStrategy.default('none'),
  buffer: z.number().min(0).max(1).default(0.1),
  smoothing: z.boolean().default(false),
});
export type PrizePacing = z.output<typeof PrizePacing>;
export type PrizePacingInput = z.input<typeof PrizePacing>;

/**
 * Parses an `"HH:mm"` string (`00:00`..`24:00`) into minutes since midnight (`0`..`1440`).
 * Returns `NaN` if the format is invalid.
 */
export function parseTimeOfDayMinutes(value: string): number {
  if (value === '24:00') return 1440;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export const TimeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, 'Time of day must be HH:mm (00:00..24:00)');
export type TimeOfDay = z.infer<typeof TimeOfDay>;

export const DayOfWeek = z.number().int().min(0).max(6);
export type DayOfWeek = z.infer<typeof DayOfWeek>;

export const WeeklyOpeningWindow = z
  .object({
    /** Days of week in campaign timezone (0 = Sunday .. 6 = Saturday). Defaults to all days if omitted. */
    days: z.array(DayOfWeek).min(1).max(7).optional(),
    /** Inclusive start time in `HH:mm` within the campaign timezone. */
    start: TimeOfDay,
    /** Exclusive end time in `HH:mm` (up to `24:00`) within the campaign timezone. */
    end: TimeOfDay,
  })
  .refine((w) => parseTimeOfDayMinutes(w.start) < parseTimeOfDayMinutes(w.end), {
    message: 'Opening window end time must be after start time',
    path: ['end'],
  });
export type WeeklyOpeningWindow = z.infer<typeof WeeklyOpeningWindow>;

export const OpeningHours = z.array(WeeklyOpeningWindow);
export type OpeningHours = z.infer<typeof OpeningHours>;

export const CampaignTimestamp = z
  .union([z.date(), z.iso.datetime({ offset: true }), z.number()])
  .transform((v) => (v instanceof Date ? v : new Date(v)))
  .refine((d) => !Number.isNaN(d.getTime()), { message: 'Invalid date' });

export const CampaignWindow = z
  .object({
    startsAt: CampaignTimestamp,
    endsAt: CampaignTimestamp,
    timezone: z
      .string()
      .trim()
      .min(1)
      .default('Asia/Ho_Chi_Minh')
      .refine(
        (tz) => {
          try {
            new Intl.DateTimeFormat('en-US', { timeZone: tz });
            return true;
          } catch {
            return false;
          }
        },
        { message: 'Invalid IANA timezone identifier' },
      ),
  })
  .refine((w) => w.startsAt.getTime() < w.endsAt.getTime(), {
    message: 'Campaign endsAt must be after startsAt',
    path: ['endsAt'],
  });
export type CampaignWindow = z.output<typeof CampaignWindow>;
export type CampaignWindowInput = z.input<typeof CampaignWindow>;

export const PrizeRules = z
  .object({
    mode: PrizeMode,
    prizes: z.array(PrizeRuleItem),
    overallWinRate: z.number().min(0).max(1).optional(),
    limits: PrizeLimits.default({}),
    budgetVnd: z.number().int().min(0).optional(),
    pacing: PrizePacing.default({ strategy: 'none', buffer: 0.1, smoothing: false }),
    openingHours: OpeningHours.optional(),
    window: CampaignWindow,
  })
  .superRefine((rules, ctx) => {
    const seenIds = new Set<string>();
    for (let i = 0; i < rules.prizes.length; i++) {
      const prize = rules.prizes[i];
      if (!prize) continue;
      if (seenIds.has(prize.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate prize id "${prize.id}"`,
          path: ['prizes', i, 'id'],
        });
      }
      seenIds.add(prize.id);
    }

    if (rules.mode === 'per_prize_probability') {
      let totalProbability = 0;
      for (let i = 0; i < rules.prizes.length; i++) {
        const prize = rules.prizes[i];
        if (!prize) continue;
        if (prize.probability === undefined) {
          ctx.addIssue({
            code: 'custom',
            message: 'Each prize requires a probability in per_prize_probability mode',
            path: ['prizes', i, 'probability'],
          });
        } else {
          totalProbability += prize.probability;
        }
      }
      if (totalProbability > 1 + PROBABILITY_EPSILON) {
        ctx.addIssue({
          code: 'custom',
          message: `Total prize probability (${totalProbability}) must not exceed 1`,
          path: ['prizes'],
        });
      }
    }

    if (rules.mode === 'overall_win_rate' && rules.overallWinRate === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'overallWinRate is required in overall_win_rate mode',
        path: ['overallWinRate'],
      });
    }
  });
export type PrizeRules = z.output<typeof PrizeRules>;
export type PrizeRulesInput = z.input<typeof PrizeRules>;

export const PlayerAwardsSnapshot = z.object({
  total: z.number().int().min(0).default(0),
  today: z.number().int().min(0).default(0),
  byPrize: z.record(z.string(), z.number().int().min(0)).default({}),
});
export type PlayerAwardsSnapshot = z.output<typeof PlayerAwardsSnapshot>;
export type PlayerAwardsSnapshotInput = z.input<typeof PlayerAwardsSnapshot>;

export const PrizeSnapshot = z.object({
  /** Remaining stock keyed by prize ID. Falls back to `prize.remaining` if omitted for a prize. */
  remainingByPrize: z.record(z.string(), z.number().int().min(0)).default({}),
  /** Total prizes issued across the campaign so far. Computed from `(quantity - remaining)` if omitted. */
  issuedTotal: z.number().int().min(0).optional(),
  /** Optional issued count per time bucket for pacing telemetry. */
  issuedByBucket: z.record(z.string(), z.number().int().min(0)).optional(),
  /** Optional issued count per prize ID. */
  issuedByPrize: z.record(z.string(), z.number().int().min(0)).optional(),
  /** Total budget consumed so far in VND. */
  budgetUsedVnd: z.number().min(0).default(0),
  /** Current player's historical award counts. */
  playerAwards: PlayerAwardsSnapshot.default({ total: 0, today: 0, byPrize: {} }),
});
export type PrizeSnapshot = z.output<typeof PrizeSnapshot>;
export type PrizeSnapshotInput = z.input<typeof PrizeSnapshot>;
