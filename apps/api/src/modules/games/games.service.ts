import { createHash } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCode,
  type GameSummary,
  type GameVersionSummary,
  type gamesApi,
  type PublishGameResponse,
  type RouteArgs,
} from '@playora/contracts';
import {
  canonicalJson,
  extractConfigAssetIds,
  extractHotConfig,
  pickAssetUrls,
  validateTemplateConfig,
} from '@playora/game-sdk';
import { getTemplate, type RegisteredServerTemplate } from '@playora/templates/server';
import type { S3Client } from 'bun';
import type { Actor } from '../../common/actor';
import { AuditService } from '../../common/audit/audit.service';
import { S3 } from '../../infra/tokens';
import {
  type GameRow,
  GamesRepository,
  type GameVersionRow,
  type GameWithVersion,
} from './games.repository';

type CreateBody = RouteArgs<typeof gamesApi.create>['body'];
type UpdateBody = RouteArgs<typeof gamesApi.update>['body'];
type ReorderBody = RouteArgs<typeof gamesApi.reorder>['body'];

export { type Actor, canonicalJson };

export function computeConfigHash(config: unknown): string {
  return createHash('sha256').update(canonicalJson(config)).digest('hex');
}

function assertFound<T>(
  value: T | null | undefined,
  message = 'Game not found',
): asserts value is T {
  if (!value) {
    throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message });
  }
}

function throwFieldValidationError(fieldErrors: Record<string, string[]>, message?: string): never {
  const firstField = Object.keys(fieldErrors)[0];
  throw new BadRequestException({
    code: ErrorCode.VALIDATION_FAILED,
    message: message ?? 'Validation failed',
    details: {
      ...(firstField ? { field: firstField } : {}),
      fieldErrors,
      body: { formErrors: [], fieldErrors },
      issues: Object.entries(fieldErrors).flatMap(([path, msgs]) =>
        msgs.map((m) => ({ path, message: m })),
      ),
    },
  });
}

@Injectable()
export class GamesService {
  constructor(
    private readonly repo: GamesRepository,
    private readonly audit: AuditService,
    @Inject(S3) private readonly s3: S3Client,
  ) {}

  private extractAssetIdsForTemplate(
    templateKey: string,
    templateVersion: string,
    config: unknown,
  ): string[] {
    const tpl = getTemplate(templateKey, templateVersion) ?? getTemplate(templateKey);
    return tpl ? extractConfigAssetIds(tpl.formDescriptor.fields, config) : [];
  }

  private async resolveAssetsMapForIds(
    orgId: string,
    assetIds: readonly string[],
  ): Promise<Record<string, string>> {
    if (assetIds.length === 0) return {};
    const rows = await this.repo.findAssetsByIds(orgId, [...new Set(assetIds)]);
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.id] = this.s3.presign(row.storageKey, { method: 'GET', expiresIn: 3600 });
    }
    return map;
  }

  private toGameSummary(
    row: GameRow,
    currentVersion: number | null,
    assets: Record<string, string> = {},
  ): GameSummary {
    return {
      id: row.id,
      organizationId: row.organizationId,
      eventId: row.eventId,
      templateId: row.templateKey,
      templateKey: row.templateKey,
      templateVersion: row.templateVersion,
      skinKey: row.skinKey ?? null,
      name: row.name,
      draftConfig: (row.draftConfig ?? {}) as Record<string, unknown>,
      hotConfig: (row.hotConfig ?? {}) as Record<string, unknown>,
      assets,
      status: row.status,
      currentVersionId: row.currentVersionId ?? null,
      currentVersion,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toGameSummaryWithAssets(
    row: GameRow,
    currentVersion: number | null,
  ): Promise<GameSummary> {
    const ids = this.extractAssetIdsForTemplate(
      row.templateKey,
      row.templateVersion,
      row.draftConfig,
    );
    const assets = await this.resolveAssetsMapForIds(row.organizationId, ids);
    return this.toGameSummary(row, currentVersion, assets);
  }

  private async toGameSummariesFromPairs(
    orgId: string,
    pairs: readonly GameWithVersion[],
  ): Promise<GameSummary[]> {
    const idsByGame = pairs.map((p) =>
      this.extractAssetIdsForTemplate(
        p.game.templateKey,
        p.game.templateVersion,
        p.game.draftConfig,
      ),
    );
    const resolved = await this.resolveAssetsMapForIds(orgId, idsByGame.flat());
    return pairs.map((p, idx) =>
      this.toGameSummary(p.game, p.currentVersion, pickAssetUrls(idsByGame[idx] ?? [], resolved)),
    );
  }

  private toVersionSummary(
    row: GameVersionRow,
    assets: Record<string, string> = {},
  ): GameVersionSummary {
    return {
      id: row.id,
      organizationId: row.organizationId,
      gameId: row.gameId,
      version: row.version,
      templateId: row.templateKey,
      templateKey: row.templateKey,
      templateVersion: row.templateVersion,
      skinKey: row.skinKey ?? null,
      config: (row.config ?? {}) as Record<string, unknown>,
      assets,
      configHash: row.configHash,
      publishedBy: row.publishedBy,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private resolveTemplateOrThrow(templateId: string, version?: string): RegisteredServerTemplate {
    const tpl = (version ? getTemplate(templateId, version) : undefined) ?? getTemplate(templateId);
    if (!tpl) {
      throwFieldValidationError(
        { templateId: [`Unknown template "${templateId}"`] },
        `Unknown template "${templateId}"`,
      );
    }
    return tpl;
  }

  private validateSkinOrThrow(
    template: RegisteredServerTemplate,
    skinKey: string | null | undefined,
  ) {
    if (skinKey === undefined || skinKey === null) return;
    if (!template.skins.some((s) => s.key === skinKey)) {
      throwFieldValidationError(
        { skinKey: [`Unknown skin "${skinKey}" for template "${template.id}"`] },
        `Unknown skin "${skinKey}"`,
      );
    }
  }

  private async ensureEventExists(orgId: string, eventId: string) {
    assertFound(await this.repo.eventExistsInOrg(orgId, eventId), 'Event not found');
  }

  private async validateConfigAndAssets(
    orgId: string,
    template: RegisteredServerTemplate,
    rawConfig: unknown,
    tx?: Parameters<GamesRepository['findAssetInOrg']>[2],
  ): Promise<Record<string, unknown>> {
    const validated = validateTemplateConfig(template, rawConfig);
    if (!validated.ok) {
      throwFieldValidationError(validated.fieldErrors, validated.message);
    }

    const assetFieldErrors: Record<string, string[]> = {};
    for (const occ of validated.externalAssets) {
      const asset = await this.repo.findAssetInOrg(orgId, occ.assetId, tx);
      if (!asset) {
        assetFieldErrors[occ.path] = ['Tài nguyên không tồn tại hoặc thuộc tổ chức khác'];
      } else if (!occ.expectedAccept.includes(asset.kind)) {
        assetFieldErrors[occ.path] = [
          `Loại tài nguyên "${asset.kind}" không hợp lệ cho trường "${occ.path}"`,
        ];
      }
    }

    if (Object.keys(assetFieldErrors).length > 0) {
      throwFieldValidationError(assetFieldErrors, 'Invalid asset reference in game config');
    }

    return validated.config;
  }

  async list(orgId: string, eventId: string): Promise<{ items: GameSummary[] }> {
    await this.ensureEventExists(orgId, eventId);
    const rows = await this.repo.listByEvent(orgId, eventId);
    return { items: await this.toGameSummariesFromPairs(orgId, rows) };
  }

  async get(orgId: string, gameId: string): Promise<GameSummary> {
    const found = await this.repo.findById(orgId, gameId);
    assertFound(found);
    return this.toGameSummaryWithAssets(found.game, found.currentVersion);
  }

  async create(orgId: string, eventId: string, body: CreateBody): Promise<GameSummary> {
    await this.ensureEventExists(orgId, eventId);
    const template = this.resolveTemplateOrThrow(body.templateId);
    this.validateSkinOrThrow(template, body.skinKey);

    const draftConfig = structuredClone(template.defaultConfig) as Record<string, unknown>;
    const row = await this.repo.transaction(async (tx) => {
      const sortOrder = await this.repo.nextSortOrder(orgId, eventId, tx);
      return this.repo.insert(
        orgId,
        {
          eventId,
          templateKey: template.id,
          templateVersion: template.version,
          skinKey: body.skinKey ?? template.skins[0]?.key ?? null,
          name: body.name,
          draftConfig,
          hotConfig: {},
          status: 'draft',
          sortOrder,
        },
        tx,
      );
    });

    return this.toGameSummaryWithAssets(row, null);
  }

  async update(orgId: string, gameId: string, body: UpdateBody): Promise<GameSummary> {
    const existing = await this.repo.findById(orgId, gameId);
    assertFound(existing);

    const template = this.resolveTemplateOrThrow(
      existing.game.templateKey,
      existing.game.templateVersion,
    );
    if (body.skinKey !== undefined) {
      this.validateSkinOrThrow(template, body.skinKey);
    }

    let validatedConfig: Record<string, unknown> | undefined;
    let nextHotConfig: Record<string, unknown> | undefined;

    if (body.draftConfig !== undefined) {
      validatedConfig = await this.validateConfigAndAssets(orgId, template, body.draftConfig);
      if (existing.game.status === 'published') {
        nextHotConfig = extractHotConfig(validatedConfig, template.hotEditable);
      }
    }

    const updated = await this.repo.update(orgId, gameId, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.skinKey !== undefined ? { skinKey: body.skinKey } : {}),
      ...(validatedConfig !== undefined ? { draftConfig: validatedConfig } : {}),
      ...(nextHotConfig !== undefined ? { hotConfig: nextHotConfig } : {}),
      updatedAt: new Date(),
    });
    assertFound(updated);
    return this.toGameSummaryWithAssets(updated, existing.currentVersion);
  }

  async reorder(
    orgId: string,
    eventId: string,
    body: ReorderBody,
  ): Promise<{ items: GameSummary[] }> {
    await this.ensureEventExists(orgId, eventId);
    const current = await this.repo.listByEvent(orgId, eventId);
    const currentIds = new Set(current.map((c) => c.game.id));
    if (body.gameIds.length !== current.length || body.gameIds.some((id) => !currentIds.has(id))) {
      throwFieldValidationError(
        { gameIds: ['Danh sách gameIds phải khớp toàn bộ trò chơi của sự kiện'] },
        'gameIds must match all active games of the event',
      );
    }

    const rows = await this.repo.transaction(async (tx) => {
      await this.repo.reorder(orgId, eventId, body.gameIds, tx);
      return this.repo.listByEvent(orgId, eventId, tx);
    });
    return { items: await this.toGameSummariesFromPairs(orgId, rows) };
  }

  async remove(orgId: string, gameId: string, actor: Actor) {
    const removed = await this.repo.transaction(async (tx) => {
      const row = await this.repo.softDelete(orgId, gameId, tx);
      if (row) {
        await this.audit.record(
          {
            organizationId: orgId,
            actorType: 'user',
            actorId: actor.userId,
            action: 'game.delete',
            targetType: 'game',
            targetId: gameId,
            ip: actor.ip,
          },
          tx,
        );
      }
      return row;
    });
    assertFound(removed);
    return { ok: true as const };
  }

  async publish(orgId: string, gameId: string, actor: Actor): Promise<PublishGameResponse> {
    const { versionRow, updatedGame } = await this.repo.transaction(async (tx) => {
      // Lock the game row first (`SELECT ... FOR UPDATE`) to serialize concurrent publishes
      // and prevent `nextVersionNumber` collisions on unique(gameId, version).
      const lockedGame = await this.repo.findByIdForUpdate(orgId, gameId, tx);
      assertFound(lockedGame);

      const template = this.resolveTemplateOrThrow(
        lockedGame.templateKey,
        lockedGame.templateVersion,
      );
      const validatedConfig = await this.validateConfigAndAssets(
        orgId,
        template,
        lockedGame.draftConfig,
        tx,
      );
      const configHash = computeConfigHash(validatedConfig);

      const nextVersion = await this.repo.nextVersionNumber(orgId, gameId, tx);
      const inserted = await this.repo.insertVersion(
        orgId,
        {
          gameId,
          version: nextVersion,
          templateKey: lockedGame.templateKey,
          templateVersion: lockedGame.templateVersion,
          skinKey: lockedGame.skinKey,
          config: validatedConfig,
          configHash,
          publishedBy: actor.userId,
        },
        tx,
      );

      const gameRow = await this.repo.update(
        orgId,
        gameId,
        {
          status: 'published',
          currentVersionId: inserted.id,
          draftConfig: validatedConfig,
          hotConfig: extractHotConfig(validatedConfig, template.hotEditable),
          updatedAt: new Date(),
        },
        tx,
      );
      assertFound(gameRow);

      await this.audit.record(
        {
          organizationId: orgId,
          actorType: 'user',
          actorId: actor.userId,
          action: 'game.publish',
          targetType: 'game',
          targetId: gameId,
          diff: { versionId: inserted.id, version: nextVersion, configHash },
          ip: actor.ip,
        },
        tx,
      );

      return { versionRow: inserted, updatedGame: gameRow };
    });

    const assetIds = this.extractAssetIdsForTemplate(
      versionRow.templateKey,
      versionRow.templateVersion,
      versionRow.config,
    );
    const assets = await this.resolveAssetsMapForIds(orgId, assetIds);
    return {
      ...this.toVersionSummary(versionRow, assets),
      game: this.toGameSummary(updatedGame, versionRow.version, assets),
    };
  }

  async listVersions(orgId: string, gameId: string): Promise<{ items: GameVersionSummary[] }> {
    assertFound(await this.repo.findById(orgId, gameId));
    const rows = await this.repo.listVersions(orgId, gameId);
    const idsByVersion = rows.map((r) =>
      this.extractAssetIdsForTemplate(r.templateKey, r.templateVersion, r.config),
    );
    const resolved = await this.resolveAssetsMapForIds(orgId, idsByVersion.flat());
    return {
      items: rows.map((r, idx) =>
        this.toVersionSummary(r, pickAssetUrls(idsByVersion[idx] ?? [], resolved)),
      ),
    };
  }
}
