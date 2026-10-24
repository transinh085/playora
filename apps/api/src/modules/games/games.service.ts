import { createHash } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCode,
  type FieldDescriptor,
  type GameSummary,
  type GameVersionSummary,
  type gamesApi,
  type PublishGameResponse,
  type RouteArgs,
} from '@playora/contracts';
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

export type { Actor };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item === undefined ? null : item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${entries.join(',')}}`;
}

export function computeConfigHash(config: unknown): string {
  return createHash('sha256').update(canonicalJson(config)).digest('hex');
}

function getAtPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function setAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!key) continue;
    const next = cur[key];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  const last = parts.at(-1);
  if (last) {
    cur[last] = value;
  }
}

function extractHotConfig(
  config: Record<string, unknown>,
  hotEditablePaths: readonly string[],
): Record<string, unknown> {
  const hot: Record<string, unknown> = {};
  for (const path of hotEditablePaths) {
    const val = getAtPath(config, path);
    if (val !== undefined) {
      setAtPath(hot, path, structuredClone(val));
    }
  }
  return hot;
}

interface AssetFieldOccurrence {
  path: string;
  slotKey?: string;
  widget: string;
  value: string;
}

function collectAssetOccurrences(
  fields: readonly FieldDescriptor[],
  config: unknown,
  prefix = '',
): AssetFieldOccurrence[] {
  if (config === null || typeof config !== 'object') return [];
  const obj = config as Record<string, unknown>;
  const out: AssetFieldOccurrence[] = [];

  for (const field of fields) {
    const val = obj[field.key];
    const currentPath = prefix ? `${prefix}.${field.key}` : field.key;

    if (field.widget === 'asset' || field.widget === 'sound' || field.slotKey) {
      if (typeof val === 'string' && val.trim().length > 0) {
        out.push({
          path: currentPath,
          slotKey: field.slotKey,
          widget: field.widget,
          value: val.trim(),
        });
      }
    } else if (field.type === 'object' && field.fields && val && typeof val === 'object') {
      out.push(...collectAssetOccurrences(field.fields, val, currentPath));
    } else if (field.type === 'array' && field.item && Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const itemVal = val[i];
        const itemPath = `${currentPath}.${i}`;
        if (field.item.widget === 'asset' || field.item.widget === 'sound' || field.item.slotKey) {
          if (typeof itemVal === 'string' && itemVal.trim().length > 0) {
            out.push({
              path: itemPath,
              slotKey: field.item.slotKey,
              widget: field.item.widget,
              value: itemVal.trim(),
            });
          }
        } else if (field.item.type === 'object' && field.item.fields) {
          out.push(...collectAssetOccurrences(field.item.fields, itemVal, itemPath));
        }
      }
    }
  }

  return out;
}

function collectBuiltInAssetStrings(template: RegisteredServerTemplate): Set<string> {
  const allowed = new Set<string>();
  const addFromFields = (fields: readonly FieldDescriptor[]) => {
    for (const f of fields) {
      if (
        (f.widget === 'asset' || f.widget === 'sound' || f.slotKey) &&
        typeof f.defaultValue === 'string'
      ) {
        allowed.add(f.defaultValue);
      }
      if (f.fields) addFromFields(f.fields);
      if (f.item) addFromFields([f.item]);
    }
  };
  addFromFields(template.formDescriptor.fields);
  for (const skin of template.skins) {
    for (const url of Object.values(skin.assets ?? {})) {
      if (typeof url === 'string') allowed.add(url);
    }
  }
  return allowed;
}

function isBuiltInAssetPath(value: string, builtIns: ReadonlySet<string>): boolean {
  if (builtIns.has(value)) return true;
  return (
    value.startsWith('/assets/') || value.startsWith('/skins/') || value.startsWith('/templates/')
  );
}

function throwFieldValidationError(fieldErrors: Record<string, string[]>, message?: string): never {
  const firstField = Object.keys(fieldErrors)[0];
  throw new BadRequestException({
    code: ErrorCode.VALIDATION_FAILED,
    message: message ?? 'Validation failed',
    details: {
      ...(firstField ? { field: firstField } : {}),
      fieldErrors,
      body: {
        formErrors: [],
        fieldErrors,
      },
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
    if (!tpl) return [];
    const occurrences = collectAssetOccurrences(tpl.formDescriptor.fields, config);
    const ids = new Set<string>();
    for (const occ of occurrences) {
      if (UUID_REGEX.test(occ.value)) {
        ids.add(occ.value);
      }
    }
    return [...ids];
  }

  private async resolveAssetsMapForIds(
    orgId: string,
    assetIds: readonly string[],
  ): Promise<Record<string, string>> {
    if (assetIds.length === 0) return {};
    const uniqueIds = [...new Set(assetIds)];
    const rows = await this.repo.findAssetsByIds(orgId, uniqueIds);
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.id] = this.s3.presign(row.storageKey, { method: 'GET', expiresIn: 3600 });
    }
    return map;
  }

  private pickAssetUrls(
    assetIds: readonly string[],
    allResolved: Readonly<Record<string, string>>,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const id of assetIds) {
      const url = allResolved[id];
      if (url) {
        out[id] = url;
      }
    }
    return out;
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
    const allIds = idsByGame.flat();
    const resolved = await this.resolveAssetsMapForIds(orgId, allIds);
    return pairs.map((p, idx) =>
      this.toGameSummary(
        p.game,
        p.currentVersion,
        this.pickAssetUrls(idsByGame[idx] ?? [], resolved),
      ),
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

  private async validateConfigAndAssets(
    orgId: string,
    template: RegisteredServerTemplate,
    rawConfig: unknown,
    tx?: Parameters<GamesRepository['findAssetInOrg']>[2],
  ): Promise<Record<string, unknown>> {
    const parsed = template.configSchema.safeParse(rawConfig);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const dotPath = issue.path.map(String).join('.') || '_root';
        fieldErrors[dotPath] ??= [];
        fieldErrors[dotPath].push(issue.message);
      }
      throwFieldValidationError(fieldErrors, 'Invalid game configuration');
    }

    const configData = parsed.data as Record<string, unknown>;
    const builtIns = collectBuiltInAssetStrings(template);
    const occurrences = collectAssetOccurrences(template.formDescriptor.fields, configData);
    const slotMap = new Map(template.assetSlots.map((s) => [s.key, s]));

    const assetFieldErrors: Record<string, string[]> = {};
    for (const occ of occurrences) {
      if (isBuiltInAssetPath(occ.value, builtIns)) {
        continue;
      }

      if (!UUID_REGEX.test(occ.value)) {
        assetFieldErrors[occ.path] = [
          'Mã tài nguyên phải là UUID hợp lệ (không lưu URL trực tiếp)',
        ];
        continue;
      }

      const asset = await this.repo.findAssetInOrg(orgId, occ.value, tx);
      if (!asset) {
        assetFieldErrors[occ.path] = ['Tài nguyên không tồn tại hoặc thuộc tổ chức khác'];
        continue;
      }

      const slot = occ.slotKey ? slotMap.get(occ.slotKey) : undefined;
      const expectedAccept =
        slot?.accept ?? (occ.widget === 'sound' ? (['audio'] as const) : (['image'] as const));
      if (!expectedAccept.includes(asset.kind)) {
        assetFieldErrors[occ.path] = [
          `Loại tài nguyên "${asset.kind}" không hợp lệ cho trường "${occ.path}"`,
        ];
      }
    }

    if (Object.keys(assetFieldErrors).length > 0) {
      throwFieldValidationError(assetFieldErrors, 'Invalid asset reference in game config');
    }

    return configData;
  }

  async list(orgId: string, eventId: string): Promise<{ items: GameSummary[] }> {
    const exists = await this.repo.eventExistsInOrg(orgId, eventId);
    if (!exists) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
    const rows = await this.repo.listByEvent(orgId, eventId);
    return {
      items: await this.toGameSummariesFromPairs(orgId, rows),
    };
  }

  async get(orgId: string, gameId: string): Promise<GameSummary> {
    const found = await this.repo.findById(orgId, gameId);
    if (!found) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Game not found' });
    }
    return this.toGameSummaryWithAssets(found.game, found.currentVersion);
  }

  async create(orgId: string, eventId: string, body: CreateBody): Promise<GameSummary> {
    const exists = await this.repo.eventExistsInOrg(orgId, eventId);
    if (!exists) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }

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
    if (!existing) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Game not found' });
    }

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

    if (!updated) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Game not found' });
    }

    return this.toGameSummaryWithAssets(updated, existing.currentVersion);
  }

  async reorder(
    orgId: string,
    eventId: string,
    body: ReorderBody,
  ): Promise<{ items: GameSummary[] }> {
    const exists = await this.repo.eventExistsInOrg(orgId, eventId);
    if (!exists) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }

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

    return {
      items: await this.toGameSummariesFromPairs(orgId, rows),
    };
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

    if (!removed) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Game not found' });
    }

    return { ok: true as const };
  }

  async publish(orgId: string, gameId: string, actor: Actor): Promise<PublishGameResponse> {
    const { versionRow, updatedGame } = await this.repo.transaction(async (tx) => {
      // Lock the game row first (`SELECT ... FOR UPDATE`) to serialize concurrent publishes
      // and prevent `nextVersionNumber` collisions on unique(gameId, version).
      const lockedGame = await this.repo.findByIdForUpdate(orgId, gameId, tx);
      if (!lockedGame) {
        throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Game not found' });
      }

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

      if (!gameRow) {
        throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Game not found' });
      }

      await this.audit.record(
        {
          organizationId: orgId,
          actorType: 'user',
          actorId: actor.userId,
          action: 'game.publish',
          targetType: 'game',
          targetId: gameId,
          diff: {
            versionId: inserted.id,
            version: nextVersion,
            configHash,
          },
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

    const versionSummary = this.toVersionSummary(versionRow, assets);
    const gameSummary = this.toGameSummary(updatedGame, versionRow.version, assets);

    return {
      ...versionSummary,
      game: gameSummary,
    };
  }

  async listVersions(orgId: string, gameId: string): Promise<{ items: GameVersionSummary[] }> {
    const existing = await this.repo.findById(orgId, gameId);
    if (!existing) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Game not found' });
    }
    const rows = await this.repo.listVersions(orgId, gameId);
    const idsByVersion = rows.map((r) =>
      this.extractAssetIdsForTemplate(r.templateKey, r.templateVersion, r.config),
    );
    const resolved = await this.resolveAssetsMapForIds(orgId, idsByVersion.flat());
    return {
      items: rows.map((r, idx) =>
        this.toVersionSummary(r, this.pickAssetUrls(idsByVersion[idx] ?? [], resolved)),
      ),
    };
  }
}
