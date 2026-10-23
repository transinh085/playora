import { randomBytes } from 'node:crypto';
import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  BrandKitTokens,
  buildEventJoinUrl,
  buildScreenLaunchUrl,
  DEFAULT_SCREEN_LAYOUT,
  ErrorCode,
  type RouteArgs,
  type ScreenBrandKit,
  ScreenLayout,
  type screensApi,
} from '@playora/contracts';
import { hashScreenKey } from '@playora/core/live';
import type { ApiEnv } from '@playora/env';
import { AuditService } from '../../common/audit/audit.service';
import { ENV } from '../../infra/tokens';
import { AssetsService } from '../assets/assets.service';
import { type EventScreenRow, ScreensRepository } from './screens.repository';

type CreateBody = RouteArgs<typeof screensApi.create>['body'];
type UpdateBody = RouteArgs<typeof screensApi.update>['body'];

export interface Actor {
  userId: string;
  ip?: string;
}

const generateRawScreenKey = () => randomBytes(32).toString('base64url');

@Injectable()
export class ScreensService {
  constructor(
    private readonly repo: ScreensRepository,
    private readonly assets: AssetsService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: ApiEnv,
  ) {}

  private toSummary(row: EventScreenRow) {
    const parsedLayout = ScreenLayout.safeParse(row.layout);
    const layout = parsedLayout.success ? parsedLayout.data : DEFAULT_SCREEN_LAYOUT;
    return {
      id: row.id,
      organizationId: row.organizationId,
      eventId: row.eventId,
      name: row.name,
      layout,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async ensureEventExists(
    orgId: string,
    eventId: string,
    tx?: Parameters<ScreensRepository['eventExistsInOrg']>[2],
  ) {
    const exists = await this.repo.eventExistsInOrg(orgId, eventId, tx);
    if (!exists) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
  }

  private async resolveAssetUrl(
    orgId: string,
    assetId: string | null | undefined,
  ): Promise<string | null> {
    if (!assetId) return null;
    try {
      const asset = await this.assets.get(orgId, assetId);
      return asset.url;
    } catch {
      return null;
    }
  }

  async list(orgId: string, eventId: string) {
    await this.ensureEventExists(orgId, eventId);
    const rows = await this.repo.listByEvent(orgId, eventId);
    return {
      items: rows.map((row) => this.toSummary(row)),
    };
  }

  async create(orgId: string, eventId: string, body: CreateBody, actor: Actor) {
    const rawKey = generateRawScreenKey();
    const screenKeyHash = hashScreenKey(rawKey);

    const row = await this.repo.transaction(async (tx) => {
      await this.ensureEventExists(orgId, eventId, tx);
      const created = await this.repo.insert(
        orgId,
        {
          eventId,
          name: body.name,
          screenKeyHash,
          layout: body.layout,
        },
        tx,
      );
      await this.audit.record(
        {
          organizationId: orgId,
          actorType: 'user',
          actorId: actor.userId,
          action: 'screen.create',
          targetType: 'event_screen',
          targetId: created.id,
          diff: { eventId, name: created.name, layout: body.layout },
          ip: actor.ip,
        },
        tx,
      );
      return created;
    });

    return {
      ...this.toSummary(row),
      key: rawKey,
      launchUrl: buildScreenLaunchUrl(this.env.PLAY_URL, rawKey),
    };
  }

  async update(orgId: string, eventId: string, screenId: string, body: UpdateBody) {
    await this.ensureEventExists(orgId, eventId);
    const updated = await this.repo.update(orgId, eventId, screenId, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.layout !== undefined ? { layout: body.layout } : {}),
    });
    if (!updated) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Screen not found' });
    }
    return this.toSummary(updated);
  }

  async revoke(orgId: string, eventId: string, screenId: string, actor: Actor) {
    const updated = await this.repo.transaction(async (tx) => {
      await this.ensureEventExists(orgId, eventId, tx);
      const row = await this.repo.update(orgId, eventId, screenId, { revokedAt: new Date() }, tx);
      if (row) {
        await this.audit.record(
          {
            organizationId: orgId,
            actorType: 'user',
            actorId: actor.userId,
            action: 'screen.revoke',
            targetType: 'event_screen',
            targetId: screenId,
            diff: { eventId },
            ip: actor.ip,
          },
          tx,
        );
      }
      return row;
    });

    if (!updated) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Screen not found' });
    }
    // TODO(realtime): publish screen.revoked on Redis so live sockets with this key are dropped immediately
    return this.toSummary(updated);
  }

  async rotate(orgId: string, eventId: string, screenId: string, actor: Actor) {
    const rawKey = generateRawScreenKey();
    const screenKeyHash = hashScreenKey(rawKey);

    const updated = await this.repo.transaction(async (tx) => {
      await this.ensureEventExists(orgId, eventId, tx);
      const row = await this.repo.update(
        orgId,
        eventId,
        screenId,
        { screenKeyHash, revokedAt: null },
        tx,
      );
      if (row) {
        await this.audit.record(
          {
            organizationId: orgId,
            actorType: 'user',
            actorId: actor.userId,
            action: 'screen.rotate',
            targetType: 'event_screen',
            targetId: screenId,
            diff: { eventId },
            ip: actor.ip,
          },
          tx,
        );
      }
      return row;
    });

    if (!updated) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Screen not found' });
    }
    // TODO(realtime): publish screen.revoked on Redis so live sockets with this key are dropped immediately

    return {
      ...this.toSummary(updated),
      key: rawKey,
      launchUrl: buildScreenLaunchUrl(this.env.PLAY_URL, rawKey),
    };
  }

  async session(rawScreenKey: string | undefined) {
    const trimmed = typeof rawScreenKey === 'string' ? rawScreenKey.trim() : '';
    if (trimmed.length < 16) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid or revoked screen key',
      });
    }

    const keyHash = hashScreenKey(trimmed);
    const active = await this.repo.findActiveSessionByKeyHash(keyHash);
    if (!active) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid or revoked screen key',
      });
    }

    const parsedLayout = ScreenLayout.safeParse(active.screen.layout);
    const layout = parsedLayout.success ? parsedLayout.data : DEFAULT_SCREEN_LAYOUT;

    let brandKit: ScreenBrandKit | null = null;
    if (active.brandKit) {
      const parsedTokens = BrandKitTokens.safeParse(active.brandKit.tokens);
      if (parsedTokens.success) {
        const tokens = parsedTokens.data;
        const [logoUrl, backgroundUrl] = await Promise.all([
          this.resolveAssetUrl(active.event.organizationId, tokens.logoAssetId),
          this.resolveAssetUrl(active.event.organizationId, tokens.backgroundAssetId),
        ]);
        brandKit = {
          id: active.brandKit.id,
          name: active.brandKit.name,
          colors: tokens.colors,
          fontHeading: tokens.fontHeading,
          fontBody: tokens.fontBody,
          logoUrl,
          backgroundUrl,
        };
      }
    }

    return {
      screen: {
        id: active.screen.id,
        name: active.screen.name,
      },
      event: {
        id: active.event.id,
        name: active.event.name,
        slug: active.event.slug,
        status: active.event.status,
      },
      brandKit,
      layout,
      joinUrl: buildEventJoinUrl(this.env.PLAY_URL, active.event.slug),
    };
  }
}
