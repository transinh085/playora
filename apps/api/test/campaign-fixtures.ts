import type { CampaignPrize, CreateCampaignBody } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import { TEST_ORIGIN } from './create-test-app';

const screen = (color: string) => ({
  height: 800,
  background: { color },
  elements: [{ id: 'title', type: 'text', text: 'Vòng quay may mắn' }],
});

const DAY = 86_400_000;

export const P1 = {
  id: 'p1',
  name: 'Ly trà sữa',
  quantity: 50,
  valueVnd: 30_000,
  probability: 0.2,
} satisfies CampaignPrize;
export const P2 = {
  id: 'p2',
  name: 'Voucher 50k',
  quantity: 10,
  valueVnd: 50_000,
  probability: 0.05,
} satisfies CampaignPrize;

/** A valid draft campaign that is live now once published. */
export function campaignBody(overrides: Partial<CreateCampaignBody> = {}): CreateCampaignBody {
  const now = Date.now();
  return {
    name: 'Khai trương Quán Đức',
    templateKey: 'spin-wheel',
    skinKey: 'grand-opening',
    brand: {
      primary: '#D7263D',
      accent: '#F4B400',
      background: '#FFF8E7',
      text: '#1F1F1F',
      surface: '#FFFFFF',
    },
    screens: {
      cover: screen('#FFF8E7'),
      form: screen('#FFF8E7'),
      game: screen('#D7263D'),
      resultWin: screen('#F4B400'),
      resultLose: screen('#EEEEEE'),
    },
    prizes: [P1, P2],
    rules: {
      mode: 'per_prize_probability',
      overallWinRate: 0.3,
      playsPerDay: 1,
      maxWinsPerPlayer: 1,
      startsAt: new Date(now - DAY).toISOString(),
      endsAt: new Date(now + 7 * DAY).toISOString(),
      openingHours: null,
      pacing: false,
      budgetVnd: null,
      collectForm: true,
    },
    ...overrides,
  };
}

/** Better Auth user id behind a session cookie. */
export async function sessionUserId(baseUrl: string, cookie: string): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/get-session`, {
    headers: { cookie, origin: TEST_ORIGIN },
  });
  const body = (await res.json()) as { user: { id: string } };
  return body.user.id;
}

/** Adds a user to an organization with a role, as an accepted invitation would. */
export async function addMember(db: Database, orgId: string, userId: string, role: string) {
  await db.insert(schema.member).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role,
    createdAt: new Date(),
  });
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(length = 8): string {
  let code = '';
  for (const b of crypto.getRandomValues(new Uint8Array(length))) {
    code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  }
  return code;
}

/**
 * Issues a live voucher the way the play engine will (player + play + award), straight in the DB
 * because the play route is built separately.
 */
export async function issueVoucher(
  db: Database,
  input: {
    orgId: string;
    campaignId: string;
    prizeKey: string;
    playerName?: string;
    expiresAt?: Date | null;
    code?: string;
  },
) {
  const [game] = await db
    .select()
    .from(schema.games)
    .where(
      and(eq(schema.games.organizationId, input.orgId), eq(schema.games.eventId, input.campaignId)),
    );
  if (!game) throw new Error('campaign game not found');
  const [prize] = await db
    .select()
    .from(schema.prizes)
    .where(and(eq(schema.prizes.gameId, game.id), eq(schema.prizes.key, input.prizeKey)));
  if (!prize) throw new Error('prize not found (publish first)');
  const [player] = await db
    .insert(schema.players)
    .values({
      organizationId: input.orgId,
      eventId: input.campaignId,
      displayName: input.playerName ?? 'Khách A',
    })
    .returning();
  if (!player) throw new Error('player insert failed');
  const [play] = await db
    .insert(schema.plays)
    .values({
      organizationId: input.orgId,
      eventId: input.campaignId,
      gameId: game.id,
      gameVersionId: game.currentVersionId,
      playerId: player.id,
      requestId: crypto.randomUUID(),
      channelKey: 'table-qr',
      outcome: 'win',
      reason: 'win',
      prizeId: prize.id,
    })
    .returning();
  if (!play) throw new Error('play insert failed');
  const code = input.code ?? randomCode();
  await db.insert(schema.awards).values({
    organizationId: input.orgId,
    eventId: input.campaignId,
    prizeId: prize.id,
    playerId: player.id,
    playId: play.id,
    redeemCode: code,
    expiresAt: input.expiresAt === undefined ? new Date(Date.now() + 7 * DAY) : input.expiresAt,
  });
  await db
    .update(schema.prizes)
    .set({ issued: prize.issued + 1, remaining: prize.remaining - 1 })
    .where(eq(schema.prizes.id, prize.id));
  return { code, playerId: player.id, playId: play.id, prizeRowId: prize.id };
}
