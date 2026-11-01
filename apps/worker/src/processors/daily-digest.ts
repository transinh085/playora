import { createDb, type Database, schema } from '@playora/db';
import { parseEnv, workerEnvSchema } from '@playora/env';
import type { JobPayload } from '@playora/jobs';
import { and, count, eq, gt, gte, isNotNull, isNull, lt, lte, ne, sql } from 'drizzle-orm';

const { awards, events, games, member, organization, plays, prizes, user } = schema;

export interface DailyDigestDeps {
  db: Database;
}

let defaultDeps: DailyDigestDeps | undefined;

function getDefaultDeps(): DailyDigestDeps {
  if (!defaultDeps) {
    const env = parseEnv(workerEnvSchema);
    const { db } = createDb(env.DATABASE_URL, { max: 4 });
    defaultDeps = { db };
  }
  return defaultDeps;
}

export interface CampaignDigestSummary {
  campaignId: string;
  campaignName: string;
  organizationId: string;
  organizationName: string;
  ownerEmail: string | null;
  date: string;
  plays: number;
  wins: number;
  visits: number;
  prizeCostVnd: number;
  lowStockPrizes: Array<{
    prizeKey: string;
    name: string;
    remaining: number;
    quantity: number;
  }>;
  subject: string;
  bodyText: string;
}

export interface DailyDigestResult {
  date: string;
  digests: CampaignDigestSummary[];
}

export function isLowStockPrize(prize: { remaining: number; quantity: number }): boolean {
  if (prize.quantity <= 0) return false;
  return prize.remaining === 0 || prize.remaining / prize.quantity <= 0.1;
}

export function buildCampaignDigestMessage(input: {
  campaignName: string;
  organizationName: string;
  date: string;
  plays: number;
  wins: number;
  visits: number;
  prizeCostVnd: number;
  lowStockPrizes: Array<{ prizeKey: string; name: string; remaining: number; quantity: number }>;
}): { subject: string; bodyText: string } {
  const lowStockTag =
    input.lowStockPrizes.length > 0 ? ` · ⚠️ ${input.lowStockPrizes.length} quà sắp hết` : '';
  const subject = `[Playora] Tóm tắt ngày ${input.date} · ${input.campaignName}${lowStockTag}`;
  const lines = [
    `Xin chào ${input.organizationName},`,
    `Báo cáo nhanh chiến dịch "${input.campaignName}" ngày ${input.date}:`,
    `- Khách tới quầy đổi quà: ${input.visits} lượt`,
    `- Lượt chơi: ${input.plays} (${input.wins} lượt trúng)`,
    `- Chi phí quà đã đổi: ${input.prizeCostVnd.toLocaleString('vi-VN')}đ`,
  ];
  if (input.lowStockPrizes.length > 0) {
    lines.push('', 'Cảnh báo tồn kho quà:');
    for (const p of input.lowStockPrizes) {
      lines.push(
        `- "${p.name}": còn ${p.remaining}/${p.quantity} (${p.remaining === 0 ? 'đã hết quà' : 'dưới 10%'})`,
      );
    }
  }
  return { subject, bodyText: lines.join('\n') };
}

/** Resolves the target `YYYY-MM-DD` date in `Asia/Ho_Chi_Minh` (defaults to yesterday). */
export function resolveDigestDate(
  dateOverride?: string,
  now = new Date(),
): {
  date: string;
  dayStart: Date;
  dayEnd: Date;
} {
  const vnOffsetMs = 7 * 3600_000;
  const date =
    dateOverride ?? new Date(now.getTime() + vnOffsetMs - 86_400_000).toISOString().slice(0, 10);
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const dayStart = new Date(Date.UTC(y, m - 1, d) - vnOffsetMs);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  return { date, dayStart, dayEnd };
}

/**
 * Daily campaign digest processor (`ANL-10`). Aggregates yesterday's plays, wins, counter visits,
 * prize cost, and low-stock warnings for running campaigns.
 */
export async function processDailyDigest(
  payload: JobPayload<'daily.digest'>,
  deps: DailyDigestDeps = getDefaultDeps(),
): Promise<DailyDigestResult> {
  const { db } = deps;
  const { date, dayStart, dayEnd } = resolveDigestDate(payload.date);

  const runningRows = await db
    .select({
      campaignId: events.id,
      campaignName: events.name,
      organizationId: events.organizationId,
      organizationName: organization.name,
      gameId: games.id,
    })
    .from(events)
    .innerJoin(organization, eq(organization.id, events.organizationId))
    .innerJoin(
      games,
      and(
        eq(games.organizationId, events.organizationId),
        eq(games.eventId, events.id),
        isNull(games.deletedAt),
        isNotNull(games.currentVersionId),
      ),
    )
    .where(
      and(
        payload.organizationId ? eq(events.organizationId, payload.organizationId) : undefined,
        isNull(events.deletedAt),
        eq(events.paused, false),
        lte(events.startsAt, dayEnd),
        gt(events.endsAt, dayStart),
        sql`jsonb_exists(${games.draftConfig}, 'rules')`,
      ),
    );

  const digests: CampaignDigestSummary[] = [];

  for (const row of runningRows) {
    const [playStats] = await db
      .select({
        plays: count(),
        wins: sql<number>`count(*) filter (where ${eq(plays.outcome, 'win')})`.mapWith(Number),
      })
      .from(plays)
      .where(
        and(
          eq(plays.organizationId, row.organizationId),
          eq(plays.eventId, row.campaignId),
          eq(plays.env, 'live'),
          gte(plays.createdAt, dayStart),
          lt(plays.createdAt, dayEnd),
        ),
      );

    const redeemedCond = and(
      isNotNull(awards.redeemedAt),
      ne(awards.status, 'void'),
      gte(awards.redeemedAt, dayStart),
      lt(awards.redeemedAt, dayEnd),
    );
    const [visitStats] = await db
      .select({
        visits: sql<number>`count(*) filter (where ${redeemedCond})`.mapWith(Number),
        prizeCostVnd:
          sql<number>`coalesce(sum(${prizes.valueVnd}) filter (where ${redeemedCond}), 0)`.mapWith(
            Number,
          ),
      })
      .from(awards)
      .innerJoin(
        prizes,
        and(eq(prizes.organizationId, row.organizationId), eq(prizes.id, awards.prizeId)),
      )
      .where(
        and(
          eq(awards.organizationId, row.organizationId),
          eq(awards.eventId, row.campaignId),
          eq(awards.env, 'live'),
        ),
      );

    const prizeRows = await db
      .select({
        key: prizes.key,
        name: prizes.name,
        remaining: prizes.remaining,
        quantity: prizes.quantity,
      })
      .from(prizes)
      .where(
        and(
          eq(prizes.organizationId, row.organizationId),
          eq(prizes.gameId, row.gameId),
          gt(prizes.quantity, 0),
        ),
      );

    const [ownerRow] = await db
      .select({ email: user.email })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(
        and(eq(member.organizationId, row.organizationId), sql`${member.role} ilike '%owner%'`),
      )
      .limit(1);

    const lowStockPrizes = prizeRows
      .filter((p) => isLowStockPrize(p))
      .map((p) => ({
        prizeKey: p.key ?? p.name,
        name: p.name,
        remaining: p.remaining,
        quantity: p.quantity,
      }));

    const playsCount = playStats?.plays ?? 0;
    const winsCount = playStats?.wins ?? 0;
    const visitsCount = visitStats?.visits ?? 0;
    const prizeCostVnd = visitStats?.prizeCostVnd ?? 0;

    const { subject, bodyText } = buildCampaignDigestMessage({
      campaignName: row.campaignName,
      organizationName: row.organizationName,
      date,
      plays: playsCount,
      wins: winsCount,
      visits: visitsCount,
      prizeCostVnd,
      lowStockPrizes,
    });

    const summary: CampaignDigestSummary = {
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      ownerEmail: ownerRow?.email ?? null,
      date,
      plays: playsCount,
      wins: winsCount,
      visits: visitsCount,
      prizeCostVnd,
      lowStockPrizes,
      subject,
      bodyText,
    };

    digests.push(summary);
  }

  return { date, digests };
}
