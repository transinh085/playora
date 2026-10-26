import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BrandKitTokens,
  ErrorCode,
  type JoinEventResponse,
  type PublicBrandKit,
  type PublicEvent,
  type publicApi,
  type RouteArgs,
} from '@playora/contracts';
import {
  buildNewConsentRecords,
  DEFAULT_PLAYER_DISPLAY_NAME,
  parseRegistrationForm,
  reconcileExistingPlayer,
  resolveDisplayName,
  validateRegistration,
} from '@playora/core/registration';
import { PLAYER_SESSION_TTL_S, signPlayerSession } from '@playora/core/session';
import type { ApiEnv } from '@playora/env';
import { AntiFraudService, antiFraudLevelOf } from '../../common/anti-fraud/anti-fraud.service';
import { PG_UNIQUE_VIOLATION, pgErrorCode } from '../../common/http/pg-errors';
import { ENV } from '../../infra/tokens';
import { AssetsService } from '../assets/assets.service';
import { type PlayerRow, PublicRepository } from './public.repository';

type JoinBody = RouteArgs<typeof publicApi.join>['body'];

export interface JoinRequestMeta {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly repo: PublicRepository,
    private readonly assets: AssetsService,
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly antiFraud: AntiFraudService,
  ) {}

  private async resolveBrandKit(
    organizationId: string,
    brandKitId: string | null,
  ): Promise<PublicBrandKit | null> {
    if (!brandKitId) return null;
    const kit = await this.repo.findBrandKit(organizationId, brandKitId);
    if (!kit) return null;
    const parsed = BrandKitTokens.safeParse(kit.tokens);
    if (!parsed.success) return null;

    const { colors, fontHeading, fontBody, logoAssetId, backgroundAssetId } = parsed.data;
    const getUrl = (id?: string | null) =>
      id
        ? this.assets
            .get(organizationId, id)
            .then((a) => a.url)
            .catch(() => null)
        : Promise.resolve(null);
    const [logoUrl, backgroundUrl] = await Promise.all([
      getUrl(logoAssetId),
      getUrl(backgroundAssetId),
    ]);
    return { colors, fontHeading, fontBody, logoUrl, backgroundUrl };
  }

  async getEvent(slug: string): Promise<PublicEvent> {
    const event = await this.repo.findEventBySlug(slug);
    if (!event) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }

    const registrationForm = parseRegistrationForm(event.registrationForm);
    const [brandKit, liveCount] = await Promise.all([
      this.resolveBrandKit(event.organizationId, event.brandKitId),
      this.repo.countLivePlayers(event.organizationId, event.id),
    ]);

    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      status: event.status,
      identity: event.identity,
      startsAt: event.startsAt ? event.startsAt.toISOString() : null,
      registrationForm,
      consents: registrationForm.consents,
      brandKit,
      playerLimitReached: liveCount >= event.playerLimit,
    };
  }

  async join(slug: string, body: JoinBody, meta: JoinRequestMeta = {}): Promise<JoinEventResponse> {
    const event = await this.repo.findEventBySlug(slug);
    if (!event || event.status === 'draft') {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
    // A campaign past its end time is over even before anyone presses End.
    const pastEnd = event.endsAt !== null && event.endsAt.getTime() <= Date.now();
    if ((event.status !== 'scheduled' && event.status !== 'live') || pastEnd) {
      throw new ConflictException({
        code: ErrorCode.EVENT_NOT_LIVE,
        message: 'Sự kiện chưa mở hoặc đã kết thúc',
      });
    }

    const formConfig = parseRegistrationForm(event.registrationForm);
    const validation = validateRegistration(formConfig, body);
    if (!validation.ok) {
      throw new BadRequestException({
        code: validation.error.code,
        message: validation.error.message,
        details: { field: validation.error.field },
      });
    }
    const { consentsMap, formData } = validation;

    const orgId = event.organizationId;
    const eventId = event.id;
    const cleanDeviceId = body.deviceId?.trim() ?? '';
    if (!cleanDeviceId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Thiếu mã thiết bị',
        details: { field: 'deviceId' },
      });
    }
    if (event.identity === 'guest_list' && !body.code?.trim()) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Vui lòng nhập mã khách mời',
        details: { field: 'code' },
      });
    }

    await this.antiFraud.checkJoin({
      level: antiFraudLevelOf(event.antiFraud),
      eventId,
      ip: meta.ip ?? '',
      deviceId: cleanDeviceId,
    });

    /*
     * No lock on the event row (ADR-012 §5): the unique indexes on players (event, env, device_id)
     * and (event, env, guest_list_entry_id) make one device = one player. Two concurrent first
     * joins from one device race on the insert; the loser retries once and finds the winner's row.
     * `playerLimit` is a count-then-insert, so it is a soft cap under concurrency.
     */
    const joinOnce = () =>
      this.repo.transaction(async (tx) => {
        let existing: PlayerRow | undefined;
        let guestEntryId: string | null = null;
        let displayName: string;
        let team: string | null = null;

        if (event.identity === 'guest_list') {
          const guest = await this.repo.findGuestByCode(orgId, eventId, body.code ?? '', tx);
          if (!guest) {
            throw new NotFoundException({
              code: ErrorCode.GUEST_CODE_NOT_FOUND,
              message: 'Mã khách mời không tồn tại trong sự kiện này',
              details: { field: 'code' },
            });
          }
          guestEntryId = guest.id;
          displayName = guest.displayName;
          team = guest.team ?? null;
          existing = await this.repo.findPlayerByGuestEntry(orgId, eventId, guest.id, tx);
          if (existing?.deviceId && existing.deviceId !== cleanDeviceId) {
            throw new ConflictException({
              code: ErrorCode.GUEST_CODE_ALREADY_USED,
              message:
                'Mã khách mời đã được sử dụng trên thiết bị khác. Vui lòng liên hệ ban tổ chức để mở khoá.',
            });
          }
        } else {
          displayName = resolveDisplayName(body.displayName, formData, formConfig.fields);
          existing = await this.repo.findPlayerByDeviceId(orgId, eventId, cleanDeviceId, tx);
        }

        const now = new Date();
        let playerRow: PlayerRow;

        if (existing) {
          const patch = reconcileExistingPlayer({
            existing,
            isGuestList: event.identity === 'guest_list',
            explicitDisplayName: body.displayName,
            defaultDisplayName: displayName,
            guestTeam: team,
            deviceId: cleanDeviceId,
            formData,
            formFields: formConfig.fields,
            now,
          });
          playerRow = patch
            ? await this.repo.updatePlayer(orgId, existing.id, patch, tx)
            : existing;
        } else {
          const liveCount = await this.repo.countLivePlayers(orgId, eventId, tx);
          if (liveCount >= event.playerLimit) {
            throw new ConflictException({
              code: ErrorCode.PLAYER_LIMIT_REACHED,
              message: 'Sự kiện đã đủ số người tham gia',
            });
          }

          playerRow = await this.repo.insertPlayer(
            orgId,
            {
              eventId,
              env: 'live',
              guestListEntryId: guestEntryId,
              displayName,
              deviceId: cleanDeviceId,
              team,
              formData,
              checkedInAt: now,
            },
            tx,
          );
        }

        if (formConfig.consents.length > 0) {
          const existingPurposes = existing
            ? await this.repo.findConsentPurposes(orgId, playerRow.id, tx)
            : new Set<string>();
          const newConsents = buildNewConsentRecords(
            formConfig.consents,
            consentsMap,
            existingPurposes,
            { playerId: playerRow.id, ip: meta.ip, userAgent: meta.userAgent },
          );
          await this.repo.insertConsents(orgId, newConsents, tx);
        }

        return playerRow;
      });
    let player: PlayerRow;
    try {
      player = await joinOnce();
    } catch (err) {
      if (pgErrorCode(err) !== PG_UNIQUE_VIOLATION) throw err;
      try {
        player = await joinOnce();
      } catch (retryErr) {
        if (pgErrorCode(retryErr) !== PG_UNIQUE_VIOLATION) throw retryErr;
        // A guest code joining from a device another guest already uses.
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          message: 'Thiết bị này đã được dùng cho một người chơi khác trong sự kiện',
          details: { field: 'deviceId' },
        });
      }
    }

    const finalDisplayName = player.displayName ?? DEFAULT_PLAYER_DISPLAY_NAME;
    const playerToken = signPlayerSession(
      {
        kind: 'player',
        organizationId: orgId,
        eventId,
        sub: player.id,
        displayName: finalDisplayName,
        ver: player.sessionVer,
        exp: Math.floor(Date.now() / 1000) + PLAYER_SESSION_TTL_S,
      },
      this.env.PLAYER_SESSION_SECRET,
    );

    return {
      playerToken,
      player: { id: player.id, displayName: finalDisplayName, team: player.team ?? null },
    };
  }
}
