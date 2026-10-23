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
  EventRegistrationForm,
  type JoinEventResponse,
  type PublicBrandKit,
  type PublicEvent,
  type PublicRegistrationForm,
  type publicApi,
  type RegistrationField,
  type RouteArgs,
} from '@playora/contracts';
import { PLAYER_TOKEN_TTL_S, signLiveToken } from '@playora/core/live';
import type { ApiEnv } from '@playora/env';
import { z } from 'zod';
import { ENV } from '../../infra/tokens';
import { AssetsService } from '../assets/assets.service';
import { normalizeRegistrationForm } from '../events/events.service';
import { type PlayerRow, PublicRepository } from './public.repository';

type JoinBody = RouteArgs<typeof publicApi.join>['body'];

export interface JoinRequestMeta {
  ip?: string;
  userAgent?: string;
}

const NAME_FIELD_KEYS = new Set([
  'name',
  'fullname',
  'full_name',
  'displayname',
  'display_name',
  'ho_ten',
  'hoten',
]);

const MAX_FORM_FIELD_VALUE_LENGTH = 500;

function parseRegistrationForm(raw: unknown): PublicRegistrationForm {
  if (!raw) return { fields: [], consents: [] };
  const parsed = EventRegistrationForm.safeParse(raw);
  if (!parsed.success) return { fields: [], consents: [] };
  return normalizeRegistrationForm(parsed.data);
}

function normalizeConsentsInput(input: JoinBody['consents']): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (!input) return map;
  if (Array.isArray(input)) {
    for (const item of input) {
      map.set(item.purpose, item.granted);
    }
  } else {
    for (const [purpose, granted] of Object.entries(input)) {
      map.set(purpose, granted);
    }
  }
  return map;
}

function resolveDisplayNameFromFields(
  fields: Record<string, string | boolean> | undefined,
  formFields: RegistrationField[],
): string | null {
  if (!fields) return null;
  for (const f of formFields) {
    if (NAME_FIELD_KEYS.has(f.key.toLowerCase())) {
      const val = fields[f.key];
      if (typeof val === 'string' && val.trim().length > 0) {
        return val.trim().slice(0, 120);
      }
    }
  }
  for (const f of formFields) {
    if (f.type === 'text') {
      const val = fields[f.key];
      if (typeof val === 'string' && val.trim().length > 0) {
        return val.trim().slice(0, 120);
      }
    }
  }
  return null;
}

function resolveDisplayName(
  explicitName: string | undefined,
  fields: Record<string, string | boolean> | undefined,
  formFields: RegistrationField[],
): string {
  const trimmed = explicitName?.trim();
  if (trimmed) return trimmed;
  return resolveDisplayNameFromFields(fields, formFields) ?? 'Người chơi';
}

@Injectable()
export class PublicService {
  constructor(
    private readonly repo: PublicRepository,
    private readonly assets: AssetsService,
    @Inject(ENV) private readonly env: ApiEnv,
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
    const [logoUrl, backgroundUrl] = await Promise.all([
      logoAssetId
        ? this.assets
            .get(organizationId, logoAssetId)
            .then((a) => a.url)
            .catch(() => null)
        : Promise.resolve(null),
      backgroundAssetId
        ? this.assets
            .get(organizationId, backgroundAssetId)
            .then((a) => a.url)
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      colors,
      fontHeading,
      fontBody,
      logoUrl,
      backgroundUrl,
    };
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
      mode: event.mode,
      status: event.status,
      identity: event.identity,
      startsAt: event.startsAt ? event.startsAt.toISOString() : null,
      registrationForm,
      consents: registrationForm.consents,
      brandKit,
      playerLimitReached: liveCount >= event.playerLimit,
    };
  }

  private validateFormAndConsents(formConfig: PublicRegistrationForm, body: JoinBody) {
    const consentsMap = normalizeConsentsInput(body.consents);

    for (const consent of formConfig.consents) {
      const granted = consentsMap.get(consent.purpose) === true;
      if (consent.required && !granted) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Vui lòng đồng ý với điều khoản bắt buộc',
          details: { field: `consents.${consent.purpose}` },
        });
      }
    }

    const fieldsRecord = body.fields ?? {};
    const formData: Record<string, string | boolean> = {};

    for (const field of formConfig.fields) {
      const rawVal = fieldsRecord[field.key];
      if (field.type === 'checkbox') {
        if (field.required && rawVal !== true) {
          throw new BadRequestException({
            code: ErrorCode.VALIDATION_FAILED,
            message: `Trường "${field.label.vi}" là bắt buộc`,
            details: { field: `fields.${field.key}` },
          });
        }
        if (typeof rawVal === 'boolean') {
          formData[field.key] = rawVal;
        }
        continue;
      }

      const strVal =
        typeof rawVal === 'string' ? rawVal.trim().slice(0, MAX_FORM_FIELD_VALUE_LENGTH) : '';
      if (field.required && strVal.length === 0) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: `Trường "${field.label.vi}" là bắt buộc`,
          details: { field: `fields.${field.key}` },
        });
      }

      if (strVal.length > 0) {
        if (field.type === 'email' && !z.email().safeParse(strVal).success) {
          throw new BadRequestException({
            code: ErrorCode.VALIDATION_FAILED,
            message: 'Email không hợp lệ',
            details: { field: `fields.${field.key}` },
          });
        }
        if (field.type === 'phone' && !/^[0-9+\-\s()]{7,20}$/.test(strVal)) {
          throw new BadRequestException({
            code: ErrorCode.VALIDATION_FAILED,
            message: 'Số điện thoại không hợp lệ',
            details: { field: `fields.${field.key}` },
          });
        }
        if (field.type === 'select' && field.options?.length && !field.options.includes(strVal)) {
          throw new BadRequestException({
            code: ErrorCode.VALIDATION_FAILED,
            message: 'Lựa chọn không hợp lệ',
            details: { field: `fields.${field.key}` },
          });
        }
        if (field.type === 'phone') {
          // TODO(PDPL): move phone to phoneEnc/phoneHash once the crypto helper lands
          formData[field.key] = strVal;
        } else {
          formData[field.key] = strVal;
        }
      }
    }

    return { consentsMap, formData };
  }

  async join(slug: string, body: JoinBody, meta: JoinRequestMeta = {}): Promise<JoinEventResponse> {
    const event = await this.repo.findEventBySlug(slug);
    if (!event) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }

    // Draft events are treated as 404 on join until rehearsal mode lands (EVT-09).
    if (event.status === 'draft') {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
    if (event.status !== 'scheduled' && event.status !== 'live') {
      throw new ConflictException({
        code: ErrorCode.EVENT_NOT_LIVE,
        message: 'Sự kiện chưa mở hoặc đã kết thúc',
      });
    }

    const formConfig = parseRegistrationForm(event.registrationForm);
    const { consentsMap, formData } = this.validateFormAndConsents(formConfig, body);

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

    const player = await this.repo.transaction(async (tx) => {
      await this.repo.lockEvent(orgId, eventId, tx);

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
        const existingFormData =
          existing.formData &&
          typeof existing.formData === 'object' &&
          !Array.isArray(existing.formData)
            ? (existing.formData as Record<string, string | boolean>)
            : {};
        const mergedFormData: Record<string, string | boolean> = {
          ...existingFormData,
          ...formData,
        };
        const formDataChanged = Object.entries(formData).some(
          ([k, v]) => existingFormData[k] !== v,
        );

        const resolvedFromForm = resolveDisplayNameFromFields(formData, formConfig.fields);
        const nextDisplayName =
          event.identity === 'guest_list'
            ? displayName
            : body.displayName?.trim() || resolvedFromForm || existing.displayName || displayName;
        const nextTeam = event.identity === 'guest_list' ? team : existing.team;
        const needsUpdate =
          !existing.checkedInAt ||
          existing.displayName !== nextDisplayName ||
          existing.team !== nextTeam ||
          existing.deviceId !== cleanDeviceId ||
          formDataChanged;

        playerRow = needsUpdate
          ? await this.repo.updatePlayer(
              orgId,
              existing.id,
              {
                displayName: nextDisplayName,
                team: nextTeam,
                checkedInAt: existing.checkedInAt ?? now,
                deviceId: cleanDeviceId,
                formData: mergedFormData,
              },
              tx,
            )
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
        const newConsents = formConfig.consents
          .filter((c) => !existingPurposes.has(c.purpose))
          .map((c) => ({
            playerId: playerRow.id,
            purpose: c.purpose,
            granted: consentsMap.get(c.purpose) === true,
            textVersion: c.textVersion,
            textHash: c.textHash,
            ip: meta.ip ?? null,
            userAgent: meta.userAgent ?? null,
          }));
        await this.repo.insertConsents(orgId, newConsents, tx);
      }

      return playerRow;
    });

    const finalDisplayName = player.displayName ?? 'Người chơi';
    const finalTeam = player.team ?? null;
    const nowS = Math.floor(Date.now() / 1000);
    const playerToken = signLiveToken(
      {
        kind: 'player',
        organizationId: orgId,
        eventId,
        sub: player.id,
        displayName: finalDisplayName,
        team: finalTeam,
        env: 'live',
        exp: nowS + PLAYER_TOKEN_TTL_S,
      },
      this.env.LIVE_TOKEN_SECRET,
    );

    return {
      playerToken,
      player: {
        id: player.id,
        displayName: finalDisplayName,
        team: finalTeam,
      },
    };
  }
}
