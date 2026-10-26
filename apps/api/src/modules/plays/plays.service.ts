import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  type CampaignPrize,
  type campaignsApi,
  ErrorCode,
  type MyVoucher,
  type PlayerState,
  type PlayResult,
  type PublicCampaign,
  type playsApi,
  type RouteArgs,
} from '@playora/contracts';
import {
  campaignPhase,
  decide,
  getTimezoneOffsetMs,
  localDayKey,
  PrizeRules,
  type PrizeSnapshotInput,
  parseTimeOfDayMinutes,
  toPrizeRules,
  VOUCHER_GRACE_MS,
} from '@playora/core/prize';
import { parseRegistrationForm } from '@playora/core/registration';
import type { PlayerSessionClaims } from '@playora/core/session';
import type { Tx } from '@playora/db';
import { AntiFraudService } from '../../common/anti-fraud/anti-fraud.service';
import { PG_UNIQUE_VIOLATION, pgErrorCode } from '../../common/http/pg-errors';
import { type CampaignDocument, readCampaignDocument } from '../campaigns/campaign-defaults';
import { voucherStatus } from '../vouchers/vouchers.service';
import { type PlayEnv, PlaysRepository, type PublishedCampaign } from './plays.repository';

type StartPlayBody = RouteArgs<typeof playsApi.play>['body'];
type RehearsalBody = RouteArgs<typeof campaignsApi.rehearsalPlay>['body'];
type PrizeView = PlayResult['prize'];

/** Voucher codes: 6 characters without look-alikes (0/O, 1/I). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_ATTEMPTS = 8;
/** `crypto.randomInt` takes ranges below 2^48; 2^47 steps give a uniform draw in [0, 1). */
const RNG_STEPS = 2 ** 47;

export function voucherCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Weekday (0 = Sunday) of the local day `now` falls on in `timeZone`. */
export function localWeekday(now: Date, timeZone: string): number {
  const [y, m, d] = localDayKey(now, timeZone).split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Start of the next local day that is open (`openDays`, null = any), plus `minutes` into it. */
export function nextOpenDayStart(
  now: Date,
  timeZone: string,
  openDays: readonly number[] | null,
  minutes = 0,
): Date {
  let day = nextLocalDayStart(now, timeZone);
  for (
    let i = 0;
    i < 7 && openDays?.length && !openDays.includes(localWeekday(day, timeZone));
    i++
  ) {
    day = nextLocalDayStart(day, timeZone);
  }
  return minutes ? nextLocalDayStart(new Date(day.getTime() - 1), timeZone, minutes) : day;
}

/** Start of the local day after `now` in `timeZone`, plus `minutes` into that day. */
export function nextLocalDayStart(now: Date, timeZone: string, minutes = 0): Date {
  const [y, m, d] = localDayKey(now, timeZone).split('-').map(Number) as [number, number, number];
  const wallClock = Date.UTC(y, m - 1, d + 1) + minutes * 60_000;
  // Offset at the guess, then again at the result so a DST switch that night is respected.
  let at = wallClock - getTimezoneOffsetMs(timeZone, wallClock);
  at = wallClock - getTimezoneOffsetMs(timeZone, at);
  return new Date(at);
}

const prizeView = (p: { id: string; name: string; image?: string | null }): PrizeView => ({
  id: p.id,
  name: p.name,
  ...(p.image ? { image: p.image } : {}),
});

/** Everything one play needs; live plays use the published version, rehearsal the draft. */
interface PlayContext {
  orgId: string;
  eventId: string;
  gameId: string;
  gameVersionId: string | null;
  env: PlayEnv;
  playerId: string;
  requestId: string;
  channelKey: string | null;
  timezone: string;
  /** Rules with the authoritative schedule (`events.startsAt/endsAt` for live plays). */
  doc: CampaignDocument;
  voucherExpiresAt: Date | null;
}

/** Thrown inside the play transaction to roll back the turn claim when the engine says closed. */
class ClosedDuringPlay extends Error {}

/**
 * The play engine (ADR-012 §4): the server checks the turn, decides the prize with
 * `@playora/core/prize` and issues stock, budget and the voucher in one transaction.
 *
 * Guarantees, also under concurrency:
 * - stock: a conditional `UPDATE … WHERE remaining > 0`; a lost race is a loss, never a re-pick;
 * - budget: winners of a capped campaign serialize on the game row, then re-read Σ issued×value;
 * - per-player limits and idempotency: each play locks its player row first;
 * - turns: a conditional upsert on `play_counters`.
 */
@Injectable()
export class PlaysService {
  constructor(
    private readonly repo: PlaysRepository,
    private readonly antiFraud: AntiFraudService,
  ) {}

  // ── Player side ──────────────────────────────────────────────────────────────

  private async loadPublished(slug: string): Promise<PublishedCampaign> {
    const campaign = await this.repo.findPublishedBySlug(slug);
    if (!campaign) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Campaign not found' });
    }
    return campaign;
  }

  /** The published campaign with the live schedule from the event (End moves `events.endsAt`). */
  private liveDocument({ event, version }: PublishedCampaign): CampaignDocument {
    const doc = version.config;
    return {
      ...doc,
      rules: {
        ...doc.rules,
        startsAt: (event.startsAt ?? new Date(doc.rules.startsAt)).toISOString(),
        endsAt: (event.endsAt ?? new Date(doc.rules.endsAt)).toISOString(),
      },
    };
  }

  private phaseOf(campaign: PublishedCampaign, now = Date.now()) {
    const { rules } = this.liveDocument(campaign);
    return campaignPhase(
      {
        published: true,
        paused: campaign.event.paused,
        startsAt: rules.startsAt,
        endsAt: rules.endsAt,
      },
      now,
    );
  }

  /** The token must belong to this campaign; a token for another campaign is refused. */
  private async authorize(campaign: PublishedCampaign, claims: PlayerSessionClaims) {
    const { event } = campaign;
    if (claims.eventId !== event.id || claims.organizationId !== event.organizationId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'This player session belongs to another campaign',
      });
    }
    const player = await this.repo.findPlayer(event.organizationId, event.id, claims.sub, 'live');
    // A bumped `players.session_ver` revokes every token issued before it.
    if (!player || player.sessionVer !== claims.ver) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Player session is no longer valid',
      });
    }
  }

  /**
   * Anti-fraud gate before a live play (EVT-13): rate limits by player and IP, and Turnstile once
   * per player session on the `standard` level. Blacklist and flagging arrive with level `high`.
   */
  private checkAntiFraud(
    doc: CampaignDocument,
    claims: PlayerSessionClaims,
    body: StartPlayBody,
    ip: string,
  ): Promise<void> {
    return this.antiFraud.checkPlay({
      level: doc.rules.antiFraud,
      eventId: claims.eventId,
      playerId: claims.sub,
      ip,
      captchaToken: body.captchaToken,
    });
  }

  async getCampaign(slug: string): Promise<PublicCampaign> {
    const campaign = await this.loadPublished(slug);
    const { event, game, version } = campaign;
    const doc = this.liveDocument(campaign);
    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      version: version.version,
      templateKey: game.templateKey as PublicCampaign['templateKey'],
      skinKey: (game.skinKey ?? 'everyday') as PublicCampaign['skinKey'],
      brand: doc.brand,
      screens: doc.screens,
      // Odds, quantities and values stay on the server.
      prizes: doc.prizes.map((p) => prizeView(p) as NonNullable<PrizeView>),
      phase: this.phaseOf(campaign),
      startsAt: doc.rules.startsAt,
      endsAt: doc.rules.endsAt,
      timezone: event.timezone,
      openingHours: doc.rules.openingHours,
      playsPerDay: doc.rules.playsPerDay,
      openDays: doc.rules.openDays,
      requireRedeemBeforeReplay: doc.rules.requireRedeemBeforeReplay,
      collectForm: doc.rules.collectForm,
      captchaSiteKey: this.antiFraud.captchaSiteKey(doc.rules.antiFraud),
      registrationForm: parseRegistrationForm(event.registrationForm),
    };
  }

  async play(
    slug: string,
    claims: PlayerSessionClaims,
    body: StartPlayBody,
    ip = '',
  ): Promise<PlayResult> {
    const campaign = await this.loadPublished(slug);
    await this.authorize(campaign, claims);
    const { event, game, version } = campaign;
    const doc = this.liveDocument(campaign);
    await this.checkAntiFraud(doc, claims, body, ip);
    const ctx: PlayContext = {
      orgId: event.organizationId,
      eventId: event.id,
      gameId: game.id,
      gameVersionId: version.id,
      env: 'live',
      playerId: claims.sub,
      requestId: body.requestId,
      channelKey: body.channel || null,
      timezone: event.timezone,
      doc,
      voucherExpiresAt: new Date(new Date(doc.rules.endsAt).getTime() + VOUCHER_GRACE_MS),
    };

    // A retry of a recorded play returns the first result, whatever the campaign state is now.
    const replay = await this.replay(ctx);
    if (replay) return replay;

    // Closed campaigns answer without claiming a turn (ADR-012 §4 step 1).
    const phase = this.phaseOf(campaign);
    if (phase !== 'live') {
      return this.closed(ctx, phase === 'paused' ? 'paused' : 'closed');
    }
    return this.run(ctx);
  }

  async me(slug: string, claims: PlayerSessionClaims): Promise<PlayerState> {
    const campaign = await this.loadPublished(slug);
    await this.authorize(campaign, claims);
    const { event, game } = campaign;
    const doc = this.liveDocument(campaign);
    const now = new Date();
    const used = await this.repo.turnsUsed(event.organizationId, {
      playerId: claims.sub,
      gameId: game.id,
      day: localDayKey(now, event.timezone),
    });
    const turnsLeftToday = Math.max(0, doc.rules.playsPerDay - used);
    let nextTurnAt: string | null = null;
    if (turnsLeftToday === 0) {
      const opensAt = doc.rules.openingHours
        ? parseTimeOfDayMinutes(doc.rules.openingHours.start)
        : 0;
      const next = nextOpenDayStart(now, event.timezone, doc.rules.openDays, opensAt);
      if (next.getTime() < new Date(doc.rules.endsAt).getTime()) nextTurnAt = next.toISOString();
    }
    const rows = await this.repo.listPlayerVouchers(event.organizationId, event.id, claims.sub);
    const nowMs = now.getTime();
    const vouchers = rows.map(
      (v): MyVoucher => ({
        code: v.code,
        prize: prizeView({
          id: v.prizeKey ?? v.prizeRowId,
          name: v.prizeName,
          image: v.prizeImageUrl,
        }) as MyVoucher['prize'],
        status: voucherStatus(v, nowMs),
        issuedAt: v.createdAt.toISOString(),
        expiresAt: v.expiresAt?.toISOString() ?? null,
        redeemedAt: v.redeemedAt?.toISOString() ?? null,
      }),
    );
    const blockedReason =
      doc.rules.requireRedeemBeforeReplay && vouchers.some((v) => v.status === 'issued')
        ? ('redeem_first' as const)
        : null;
    return { turnsLeftToday, nextTurnAt, blockedReason, vouchers };
  }

  // ── Rehearsal (Studio) ───────────────────────────────────────────────────────

  /**
   * Plays the current draft as a tester (docs/product/specs/builder.md §4.1). Rehearsal ignores the
   * schedule, pause and pacing, counts its own stock (draft quantity − rehearsal awards) and
   * budget, and writes only `rehearsal` rows: live stock, issued counts and stats never move.
   */
  async rehearsalPlay(orgId: string, campaignId: string, body: RehearsalBody): Promise<PlayResult> {
    const row = await this.repo.findCampaign(orgId, campaignId);
    if (!row) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Campaign not found' });
    }
    const { event, game } = row;
    const doc = readCampaignDocument(game.draftConfig);
    const parsed = PrizeRules.safeParse(
      toPrizeRules(doc.rules, doc.prizes, { rehearsal: true, timezone: event.timezone }),
    );
    if (!parsed.success) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_PRIZE_RULES,
        message: parsed.error.issues[0]?.message ?? 'Invalid prize rules',
      });
    }
    const playerId = await this.repo.transaction(async (tx) => {
      await this.repo.lockRehearsal(orgId, game.id, tx);
      return (await this.repo.findOrCreateTester(orgId, event.id, body.testerKey, tx)).id;
    });
    return this.run({
      orgId,
      eventId: event.id,
      gameId: game.id,
      gameVersionId: null,
      env: 'rehearsal',
      playerId,
      requestId: body.requestId,
      channelKey: null,
      timezone: event.timezone,
      doc,
      voucherExpiresAt: new Date(new Date(doc.rules.endsAt).getTime() + VOUCHER_GRACE_MS),
    });
  }

  // ── Engine ───────────────────────────────────────────────────────────────────

  private async turnsLeft(ctx: PlayContext, now = new Date()) {
    const used = await this.repo.turnsUsed(ctx.orgId, {
      playerId: ctx.playerId,
      gameId: ctx.gameId,
      day: localDayKey(now, ctx.timezone),
    });
    return Math.max(0, ctx.doc.rules.playsPerDay - used);
  }

  private async closed(ctx: PlayContext, reason: 'closed' | 'paused'): Promise<PlayResult> {
    return {
      playId: null,
      outcome: 'closed',
      reason,
      prize: null,
      voucher: null,
      turnsLeftToday: await this.turnsLeft(ctx),
    };
  }

  /** Rebuilds the result of a recorded play (idempotent retry). */
  private async replay(ctx: PlayContext): Promise<PlayResult | undefined> {
    const row = await this.repo.findPlayByRequest(ctx.orgId, ctx.playerId, ctx.requestId);
    if (!row) return undefined;
    return {
      playId: row.id,
      outcome: row.outcome,
      reason: row.reason,
      prize:
        row.prizeRowId && row.prizeName
          ? prizeView({
              id: row.prizeKey ?? row.prizeRowId,
              name: row.prizeName,
              image: row.prizeImageUrl,
            })
          : null,
      voucher: row.code
        ? { code: row.code, expiresAt: row.expiresAt?.toISOString() ?? null }
        : null,
      turnsLeftToday: await this.turnsLeft(ctx),
    };
  }

  private async run(ctx: PlayContext): Promise<PlayResult> {
    try {
      const result = await this.repo.transaction((tx) => this.playInTx(ctx, tx));
      return result ?? (await this.replay(ctx)) ?? this.closed(ctx, 'closed');
    } catch (err) {
      if (err instanceof ClosedDuringPlay) return this.closed(ctx, 'closed');
      // A concurrent duplicate committed first: answer with its result.
      if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
        const replay = await this.replay(ctx);
        if (replay) return replay;
      }
      throw err;
    }
  }

  /** One play in one transaction. Returns undefined when the request was already recorded. */
  private async playInTx(ctx: PlayContext, tx: Tx): Promise<PlayResult | undefined> {
    const { orgId, doc, env } = ctx;
    const now = new Date();
    const day = localDayKey(now, ctx.timezone);
    const playsPerDay = doc.rules.playsPerDay;

    // 0. Serialize this player's plays; a waiting duplicate then sees the committed play.
    if (!(await this.repo.lockPlayer(orgId, ctx.eventId, ctx.playerId, env, tx))) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Player session is no longer valid',
      });
    }
    if (await this.repo.findPlayByRequest(orgId, ctx.playerId, ctx.requestId, tx)) {
      return undefined;
    }
    if (env === 'rehearsal') {
      await this.repo.lockRehearsal(orgId, ctx.gameId, tx);
      await this.repo.ensurePrizeRows(
        orgId,
        { eventId: ctx.eventId, gameId: ctx.gameId, prizes: doc.prizes },
        tx,
      );
    }

    // 1. "Redeem first": a live player holding an unused voucher must visit the counter before the
    //    next turn. Checked under the player lock, before the claim, so no turn is spent.
    if (
      env === 'live' &&
      doc.rules.requireRedeemBeforeReplay &&
      (await this.repo.hasUnredeemedVoucher(
        orgId,
        { eventId: ctx.eventId, playerId: ctx.playerId, env },
        tx,
      ))
    ) {
      return {
        playId: null,
        outcome: 'no_turns',
        reason: 'redeem_first',
        prize: null,
        voucher: null,
        turnsLeftToday: Math.max(
          0,
          playsPerDay -
            (await this.repo.turnsUsed(
              orgId,
              { playerId: ctx.playerId, gameId: ctx.gameId, day },
              tx,
            )),
        ),
      };
    }

    // 2. Claim a turn.
    const turn = await this.repo.claimTurn(
      orgId,
      { playerId: ctx.playerId, gameId: ctx.gameId, day, limit: playsPerDay },
      tx,
    );
    if (turn === undefined) {
      return {
        playId: null,
        outcome: 'no_turns',
        reason: 'no_turns',
        prize: null,
        voucher: null,
        turnsLeftToday: 0,
      };
    }

    // 3. Snapshot.
    const prizeRows = await this.repo.listPrizes(orgId, ctx.gameId, tx);
    const rowByKey = new Map(prizeRows.filter((p) => p.key).map((p) => [p.key as string, p]));
    const remainingByPrize: Record<string, number> = {};
    let budgetUsedVnd = 0;
    if (env === 'live') {
      for (const prize of doc.prizes)
        remainingByPrize[prize.id] = rowByKey.get(prize.id)?.remaining ?? 0;
      for (const row of prizeRows) budgetUsedVnd += row.issued * (row.valueVnd ?? 0);
    } else {
      const issued = await this.repo.awardCountsByPrizeKey(
        orgId,
        { eventId: ctx.eventId, env, timezone: ctx.timezone, day },
        tx,
      );
      const issuedByKey = new Map(issued.map((r) => [r.key, r.total]));
      for (const prize of doc.prizes) {
        const n = issuedByKey.get(prize.id) ?? 0;
        remainingByPrize[prize.id] = Math.max(0, prize.quantity - n);
        budgetUsedVnd += n * prize.valueVnd;
      }
    }
    const mine = await this.repo.awardCountsByPrizeKey(
      orgId,
      { eventId: ctx.eventId, env, playerId: ctx.playerId, timezone: ctx.timezone, day },
      tx,
    );
    const snapshot: PrizeSnapshotInput = {
      remainingByPrize,
      budgetUsedVnd,
      playerAwards: {
        total: mine.reduce((s, r) => s + r.total, 0),
        today: mine.reduce((s, r) => s + r.today, 0),
        byPrize: Object.fromEntries(mine.filter((r) => r.key).map((r) => [r.key, r.total])),
      },
    };

    // 4. Decide.
    const draws: number[] = [];
    const rng = () => {
      const u = randomInt(RNG_STEPS) / RNG_STEPS;
      draws.push(u);
      return u;
    };
    const rules = toPrizeRules(doc.rules, doc.prizes, {
      rehearsal: env === 'rehearsal',
      timezone: ctx.timezone,
      now,
      remainingByPrize,
    });
    const decision = decide({ rules, snapshot, now, rng });
    // Outside opening hours (or the window closed meanwhile): undo the turn claim.
    if (decision.reason === 'closed') throw new ClosedDuringPlay();

    // 5. Issue stock and budget atomically; a lost race is a loss, never a re-pick.
    let reason: string = decision.reason;
    let won: { prize: CampaignPrize; rowId: string } | null = null;
    const prize = decision.prizeId ? doc.prizes.find((p) => p.id === decision.prizeId) : undefined;
    const prizeRow = prize ? rowByKey.get(prize.id) : undefined;
    if (decision.prizeId) {
      if (!prize || !prizeRow) {
        reason = 'out_of_stock';
      } else if (env === 'rehearsal') {
        // Rehearsal stock is counted under the rehearsal lock, so the snapshot is exact.
        won = { prize, rowId: prizeRow.id };
      } else {
        const budget = doc.rules.budgetVnd;
        let withinBudget = true;
        if (budget !== null) {
          await this.repo.lockGameForBudget(orgId, ctx.gameId, tx);
          const used = await this.repo.liveBudgetUsed(orgId, ctx.gameId, tx);
          withinBudget = used + (prizeRow.valueVnd ?? 0) <= budget;
        }
        if (!withinBudget) reason = 'budget';
        else if (!(await this.repo.takeStock(orgId, prizeRow.id, tx))) reason = 'out_of_stock';
        else won = { prize, rowId: prizeRow.id };
      }
    }

    // 6. Record the play and the voucher.
    const play = await this.repo.insertPlay(
      orgId,
      {
        eventId: ctx.eventId,
        gameId: ctx.gameId,
        gameVersionId: ctx.gameVersionId,
        playerId: ctx.playerId,
        env,
        requestId: ctx.requestId,
        channelKey: ctx.channelKey,
        outcome: won ? 'win' : 'lose',
        reason: won ? 'win' : reason,
        prizeId: won?.rowId ?? null,
        rngProof: {
          at: now.toISOString(),
          day,
          turn,
          draws,
          decision,
          snapshot,
          gameVersionId: ctx.gameVersionId,
        },
      },
      tx,
    );

    let voucher: PlayResult['voucher'] = null;
    if (won) {
      for (let attempt = 1; !voucher; attempt++) {
        const award = await this.repo.insertAward(
          orgId,
          {
            eventId: ctx.eventId,
            prizeId: won.rowId,
            playerId: ctx.playerId,
            playId: play.id,
            env,
            redeemCode: voucherCode(),
            expiresAt: ctx.voucherExpiresAt,
          },
          tx,
        );
        if (award) {
          voucher = { code: award.code, expiresAt: award.expiresAt?.toISOString() ?? null };
        } else if (attempt >= CODE_ATTEMPTS) {
          throw new Error('Could not allocate a unique voucher code');
        }
      }
    }

    return {
      playId: play.id,
      outcome: won ? 'win' : 'lose',
      reason: won ? 'win' : reason,
      prize: won ? prizeView(won.prize) : null,
      voucher,
      turnsLeftToday: Math.max(0, playsPerDay - turn),
    };
  }
}
