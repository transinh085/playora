import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Campaign,
  type CampaignListItem,
  type CampaignPlayRecord,
  type CampaignStats,
  type CampaignVoucher,
  type campaignsApi,
  ErrorCode,
  type RouteArgs,
  type VoucherStatus,
} from '@playora/contracts';
import { campaignPhase, isRunningPhase, PrizeRules, toPrizeRules } from '@playora/core/prize';
import { canonicalJson } from '@playora/game-sdk';
import type { Actor } from '../../common/actor';
import { AuditService } from '../../common/audit/audit.service';
import { PG_UNIQUE_VIOLATION, pgErrorCode } from '../../common/http/pg-errors';
import {
  CAMPAIGN_PLAYER_LIMIT,
  type CampaignDocument,
  DEFAULT_CAMPAIGN_TIMEZONE,
  eventMirror,
  generateSlug,
  templateVersionFor,
} from './campaign-defaults';
import { type CampaignRow, CampaignsRepository } from './campaigns.repository';

type ListQuery = RouteArgs<typeof campaignsApi.list>['query'];
type CreateBody = RouteArgs<typeof campaignsApi.create>['body'];
type UpdateBody = RouteArgs<typeof campaignsApi.update>['body'];
type PlaysQuery = RouteArgs<typeof campaignsApi.plays>['query'];
type VouchersQuery = RouteArgs<typeof campaignsApi.vouchers>['query'];

const GENERATED_SLUG_ATTEMPTS = 5;

export function computeConfigHash(config: unknown): string {
  return createHash('sha256').update(canonicalJson(config)).digest('hex');
}

const sameInstant = (a: string | Date | null | undefined, b: string | Date | null | undefined) =>
  a != null && b != null && new Date(a).getTime() === new Date(b).getTime();

function notFound(): never {
  throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Campaign not found' });
}

function notPublished(): never {
  throw new ConflictException({
    code: ErrorCode.CAMPAIGN_NOT_PUBLISHED,
    message: 'Campaign has not been published',
  });
}

function voucherStatus(
  row: { status: string; redeemedAt: Date | null; expiresAt: Date | null },
  now = Date.now(),
): VoucherStatus {
  if (row.status === 'void') return 'void';
  if (row.redeemedAt) return 'redeemed';
  if (row.expiresAt && row.expiresAt.getTime() <= now) return 'expired';
  return 'issued';
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly repo: CampaignsRepository,
    private readonly audit: AuditService,
  ) {}

  // ── Mapping ──────────────────────────────────────────────────────────────────

  private toListItem(row: CampaignRow, now = Date.now()): CampaignListItem {
    const { event, game, version } = row;
    const doc = game.draftConfig as CampaignDocument;
    const published = version !== null;
    // Once published, `events.startsAt/endsAt` are the live schedule (publish and end write them).
    const phase = campaignPhase(
      {
        published,
        paused: event.paused,
        startsAt: published && event.startsAt ? event.startsAt : doc.rules.startsAt,
        endsAt: published && event.endsAt ? event.endsAt : doc.rules.endsAt,
      },
      now,
    );
    return {
      id: event.id,
      organizationId: event.organizationId,
      slug: event.slug,
      name: event.name,
      templateKey: game.templateKey as Campaign['templateKey'],
      skinKey: (game.skinKey ?? 'everyday') as Campaign['skinKey'],
      brand: doc.brand,
      prizes: doc.prizes,
      rules: doc.rules,
      status: published ? 'published' : 'draft',
      phase,
      paused: event.paused,
      version: version?.version ?? 0,
      publishedAt: version ? version.createdAt.toISOString() : null,
      hasUnpublishedChanges: version ? this.hasUnpublishedChanges(row) : false,
      createdAt: event.createdAt.toISOString(),
      updatedAt: new Date(
        Math.max(event.updatedAt.getTime(), game.updatedAt.getTime()),
      ).toISOString(),
    };
  }

  private toCampaign(row: CampaignRow): Campaign {
    const doc = row.game.draftConfig as CampaignDocument;
    return { ...this.toListItem(row), screens: doc.screens };
  }

  /**
   * The schedule is live state: `end` moves `events.endsAt` and the draft `rules.endsAt` without
   * publishing a new version. So the content is compared with the published dates put back,
   * and the draft dates are compared with the live dates on the event.
   */
  private hasUnpublishedChanges(row: CampaignRow): boolean {
    const { event, game, version } = row;
    if (!version) return false;
    const doc = game.draftConfig as CampaignDocument;
    const asPublished: CampaignDocument = {
      ...doc,
      rules: {
        ...doc.rules,
        startsAt: version.startsAt ?? doc.rules.startsAt,
        endsAt: version.endsAt ?? doc.rules.endsAt,
      },
    };
    return (
      computeConfigHash(asPublished) !== version.configHash ||
      (game.skinKey ?? null) !== (version.skinKey ?? null) ||
      !sameInstant(doc.rules.startsAt, event.startsAt) ||
      !sameInstant(doc.rules.endsAt, event.endsAt)
    );
  }

  private async load(orgId: string, campaignId: string): Promise<CampaignRow> {
    const row = await this.repo.findById(orgId, campaignId);
    if (!row) notFound();
    return row;
  }

  private recordAudit(
    orgId: string,
    actor: Actor,
    action: string,
    campaignId: string,
    diff?: unknown,
    tx?: Parameters<AuditService['record']>[1],
  ) {
    return this.audit.record(
      {
        organizationId: orgId,
        actorType: 'user',
        actorId: actor.userId,
        action,
        targetType: 'campaign',
        targetId: campaignId,
        diff,
        ip: actor.ip,
      },
      tx,
    );
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  async list(orgId: string, query: ListQuery) {
    const page = await this.repo.list(orgId, query);
    const now = Date.now();
    return { items: page.items.map((r) => this.toListItem(r, now)), nextCursor: page.nextCursor };
  }

  async get(orgId: string, campaignId: string): Promise<Campaign> {
    return this.toCampaign(await this.load(orgId, campaignId));
  }

  async create(orgId: string, body: CreateBody): Promise<Campaign> {
    const doc: CampaignDocument = {
      brand: body.brand,
      screens: body.screens,
      prizes: body.prizes,
      rules: body.rules,
    };
    const attempts = body.slug ? 1 : GENERATED_SLUG_ATTEMPTS;
    for (let attempt = 1; ; attempt++) {
      const slug = body.slug ?? generateSlug(body.name);
      try {
        const eventId = await this.repo.transaction(async (tx) => {
          const now = new Date();
          const event = await this.repo.insertEvent(
            orgId,
            {
              name: body.name,
              slug,
              status: 'draft',
              timezone: DEFAULT_CAMPAIGN_TIMEZONE,
              playerLimit: CAMPAIGN_PLAYER_LIMIT,
              paused: false,
              ...eventMirror(doc),
              updatedAt: now,
            },
            tx,
          );
          await this.repo.insertGame(
            orgId,
            {
              eventId: event.id,
              templateKey: body.templateKey,
              templateVersion: templateVersionFor(body.templateKey),
              skinKey: body.skinKey,
              name: body.name,
              draftConfig: doc,
              status: 'draft',
              updatedAt: now,
            },
            tx,
          );
          return event.id;
        });
        return this.get(orgId, eventId);
      } catch (err) {
        if (pgErrorCode(err) !== PG_UNIQUE_VIOLATION) throw err;
        if (attempt < attempts) continue;
        if (body.slug) {
          throw new ConflictException({
            code: ErrorCode.SLUG_TAKEN,
            message: `Đường dẫn "${body.slug}" đã được dùng`,
            details: { field: 'slug' },
          });
        }
        throw err;
      }
    }
  }

  /** Saves the draft; a published campaign keeps running on its published version. */
  async update(orgId: string, campaignId: string, body: UpdateBody): Promise<Campaign> {
    await this.repo.transaction(async (tx) => {
      if (!(await this.repo.lockGame(orgId, campaignId, tx))) notFound();
      const row = await this.repo.findById(orgId, campaignId, tx);
      if (!row) notFound();
      const current = row.game.draftConfig as CampaignDocument;
      const doc: CampaignDocument = {
        brand: body.brand ?? current.brand,
        screens: body.screens ?? current.screens,
        prizes: body.prizes ?? current.prizes,
        rules: body.rules ?? current.rules,
      };
      const now = new Date();
      await this.repo.updateGame(
        orgId,
        row.game.id,
        {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.skinKey !== undefined ? { skinKey: body.skinKey } : {}),
          draftConfig: doc,
          updatedAt: now,
        },
        tx,
      );
      await this.repo.updateEvent(
        orgId,
        campaignId,
        {
          ...(body.name !== undefined ? { name: body.name } : {}),
          // Before the first publish the event mirrors the draft; afterwards only publish does.
          ...(row.version ? {} : eventMirror(doc)),
          updatedAt: now,
        },
        tx,
      );
    });
    return this.get(orgId, campaignId);
  }

  async remove(orgId: string, campaignId: string, actor: Actor) {
    await this.repo.transaction(async (tx) => {
      if (!(await this.repo.lockGame(orgId, campaignId, tx))) notFound();
      const row = await this.repo.findById(orgId, campaignId, tx);
      if (!row) notFound();
      const { phase } = this.toListItem(row);
      if (isRunningPhase(phase)) {
        throw new ConflictException({
          code: ErrorCode.CAMPAIGN_RUNNING,
          message: 'Pause or end the campaign before deleting it',
          details: { phase },
        });
      }
      await this.repo.softDelete(orgId, campaignId, tx);
      await this.recordAudit(orgId, actor, 'campaign.delete', campaignId, { phase }, tx);
    });
    return { ok: true as const };
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  async publish(orgId: string, campaignId: string, actor: Actor): Promise<Campaign> {
    await this.repo.transaction(async (tx) => {
      if (!(await this.repo.lockGame(orgId, campaignId, tx))) notFound();
      const row = await this.repo.findById(orgId, campaignId, tx);
      if (!row) notFound();
      const { event, game } = row;
      const doc = game.draftConfig as CampaignDocument;

      const parsed = PrizeRules.safeParse(
        toPrizeRules(doc.rules, doc.prizes, { rehearsal: false, timezone: event.timezone }),
      );
      if (!parsed.success) {
        throw new BadRequestException({
          code: ErrorCode.INVALID_PRIZE_RULES,
          message: parsed.error.issues[0]?.message ?? 'Invalid prize rules',
          details: {
            issues: parsed.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          },
        });
      }

      // Prize stock: upsert by key, keep what was already issued.
      const existing = await this.repo.listPrizes(orgId, game.id, tx);
      const byKey = new Map(existing.map((p) => [p.key, p]));
      const draftKeys = new Set<string>();
      for (const [i, prize] of doc.prizes.entries()) {
        draftKeys.add(prize.id);
        const data = {
          name: prize.name,
          imageUrl: prize.image ?? null,
          valueVnd: prize.valueVnd,
          quantity: prize.quantity,
          sortOrder: i,
        };
        const found = byKey.get(prize.id);
        if (!found) {
          await this.repo.insertPrize(
            orgId,
            {
              ...data,
              eventId: event.id,
              gameId: game.id,
              key: prize.id,
              issued: 0,
              remaining: prize.quantity,
            },
            tx,
          );
        } else if (!(await this.repo.setPrizeStock(orgId, found.id, data, tx))) {
          throw new ConflictException({
            code: ErrorCode.PRIZE_QUANTITY_BELOW_ISSUED,
            message: `Prize "${prize.name}" quantity ${prize.quantity} is below the ${found.issued} already issued`,
            details: { field: `prizes.${i}.quantity`, prizeId: prize.id, issued: found.issued },
          });
        }
      }
      for (const prize of existing) {
        if (!prize.key || !draftKeys.has(prize.key))
          await this.repo.retirePrize(orgId, prize.id, tx);
      }

      const configHash = computeConfigHash(doc);
      const version = await this.repo.nextVersionNumber(orgId, game.id, tx);
      const inserted = await this.repo.insertVersion(
        orgId,
        {
          gameId: game.id,
          version,
          templateKey: game.templateKey,
          templateVersion: game.templateVersion,
          skinKey: game.skinKey,
          config: doc,
          configHash,
          publishedBy: actor.userId,
        },
        tx,
      );
      const now = new Date();
      await this.repo.updateGame(
        orgId,
        game.id,
        { status: 'published', currentVersionId: inserted.id, updatedAt: now },
        tx,
      );
      await this.repo.updateEvent(
        orgId,
        event.id,
        { status: 'live', ...eventMirror(doc), updatedAt: now },
        tx,
      );
      await this.recordAudit(
        orgId,
        actor,
        'campaign.publish',
        campaignId,
        { versionId: inserted.id, version, configHash },
        tx,
      );
    });
    return this.get(orgId, campaignId);
  }

  private async setLifecycle(
    orgId: string,
    campaignId: string,
    actor: Actor,
    action: 'pause' | 'resume' | 'end',
  ): Promise<Campaign> {
    await this.repo.transaction(async (tx) => {
      if (!(await this.repo.lockGame(orgId, campaignId, tx))) notFound();
      const row = await this.repo.findById(orgId, campaignId, tx);
      if (!row) notFound();
      if (!row.version) notPublished();
      const now = new Date();

      if (action === 'end') {
        /*
         * Ending moves the end time to now instead of touching the immutable published version:
         * `events.endsAt` is the authoritative end for live plays (the play engine reads it), and
         * the draft `rules.endsAt` follows so the Studio shows the same schedule and a later
         * republish does not silently reopen the campaign. Extending = editing endsAt + publish.
         * Issued vouchers keep their own `expiresAt`.
         */
        const doc = row.game.draftConfig as CampaignDocument;
        const endsAt = now.toISOString();
        // Both dates in UTC `Z` form: the contract compares the ISO strings.
        const startsAt = new Date(
          Math.min(new Date(doc.rules.startsAt).getTime(), now.getTime() - 1000),
        ).toISOString();
        await this.repo.updateGame(
          orgId,
          row.game.id,
          { draftConfig: { ...doc, rules: { ...doc.rules, startsAt, endsAt } }, updatedAt: now },
          tx,
        );
        await this.repo.updateEvent(
          orgId,
          campaignId,
          {
            paused: false,
            status: 'ended',
            startsAt: new Date(startsAt),
            endsAt: now,
            updatedAt: now,
          },
          tx,
        );
      } else {
        await this.repo.updateGame(orgId, row.game.id, { updatedAt: now }, tx);
        await this.repo.updateEvent(
          orgId,
          campaignId,
          { paused: action === 'pause', updatedAt: now },
          tx,
        );
      }
      await this.recordAudit(orgId, actor, `campaign.${action}`, campaignId, undefined, tx);
    });
    return this.get(orgId, campaignId);
  }

  pause(orgId: string, campaignId: string, actor: Actor) {
    return this.setLifecycle(orgId, campaignId, actor, 'pause');
  }

  resume(orgId: string, campaignId: string, actor: Actor) {
    return this.setLifecycle(orgId, campaignId, actor, 'resume');
  }

  end(orgId: string, campaignId: string, actor: Actor) {
    return this.setLifecycle(orgId, campaignId, actor, 'end');
  }

  // ── Reporting ────────────────────────────────────────────────────────────────

  async plays(orgId: string, campaignId: string, query: PlaysQuery) {
    await this.load(orgId, campaignId);
    const page = await this.repo.listPlays(orgId, campaignId, query);
    return {
      items: page.items.map(
        (p): CampaignPlayRecord => ({
          id: p.id,
          playerId: p.playerId,
          playerName: p.playerName ?? null,
          rehearsal: p.env === 'rehearsal',
          at: p.createdAt.toISOString(),
          outcome: p.outcome,
          reason: p.reason,
          prizeId: p.prizeRowId ? (p.prizeKey ?? p.prizeRowId) : null,
          voucherCode: p.voucherCode ?? null,
          channel: p.channel ?? null,
        }),
      ),
      nextCursor: page.nextCursor,
    };
  }

  async vouchers(orgId: string, campaignId: string, query: VouchersQuery) {
    await this.load(orgId, campaignId);
    const page = await this.repo.listVouchers(orgId, campaignId, query);
    const now = Date.now();
    return {
      items: page.items.map(
        (v): CampaignVoucher => ({
          code: v.code,
          campaignId,
          prizeId: v.prizeKey ?? v.prizeRowId,
          prizeName: v.prizeName,
          playerId: v.playerId,
          playerName: v.playerName ?? null,
          rehearsal: v.env === 'rehearsal',
          status: voucherStatus(v, now),
          issuedAt: v.createdAt.toISOString(),
          expiresAt: v.expiresAt?.toISOString() ?? null,
          redeemedAt: v.redeemedAt?.toISOString() ?? null,
        }),
      ),
      nextCursor: page.nextCursor,
    };
  }

  async stats(orgId: string, campaignId: string): Promise<CampaignStats> {
    const row = await this.load(orgId, campaignId);
    const s = await this.repo.stats(orgId, campaignId, row.game.id);
    const remainingByPrize: Record<string, number> = {};
    const issuedByPrize: Record<string, number> = {};
    let budgetUsedVnd = 0;
    for (const p of s.prizes) {
      const key = p.key ?? p.id;
      remainingByPrize[key] = p.remaining;
      issuedByPrize[key] = p.issued;
      budgetUsedVnd += p.issued * (p.valueVnd ?? 0);
    }
    return {
      plays: s.plays,
      players: s.players,
      wins: s.wins,
      redeemed: s.redeemed,
      budgetUsedVnd,
      redeemedValueVnd: s.redeemedValueVnd,
      remainingByPrize,
      issuedByPrize,
    };
  }
}
