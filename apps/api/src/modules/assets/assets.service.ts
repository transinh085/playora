import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AssetVariants,
  type assetsApi,
  ErrorCode,
  MAX_ASSET_BYTES,
  type RouteArgs,
} from '@playora/contracts';
import type { Producer } from '@playora/jobs';
import type { S3Client } from 'bun';
import { uuidv7 } from 'uuidv7';
import type { Actor } from '../../common/actor';
import { AuditService } from '../../common/audit/audit.service';
import { JOBS, S3 } from '../../infra/tokens';
import { type AssetRow, AssetsRepository } from './assets.repository';

type CreateUploadBody = RouteArgs<typeof assetsApi.createUpload>['body'];
type CompleteUploadBody = RouteArgs<typeof assetsApi.completeUpload>['body'];
type ListQuery = RouteArgs<typeof assetsApi.list>['query'];

export type { Actor };

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/aac': 'aac',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

@Injectable()
export class AssetsService {
  constructor(
    private readonly repo: AssetsRepository,
    private readonly audit: AuditService,
    @Inject(S3) private readonly s3: S3Client,
    @Inject(JOBS) private readonly jobs: Producer,
  ) {}

  private toSummary(row: AssetRow) {
    const rawVariants = (row.variants ?? {}) as AssetVariants;
    const variants: AssetVariants = {};
    for (const [key, variant] of Object.entries(rawVariants)) {
      if (variant && typeof variant.key === 'string') {
        variants[key] = {
          ...variant,
          url: this.s3.presign(variant.key, { method: 'GET', expiresIn: 3600 }),
        };
      }
    }
    const { storageKey, ...rest } = row;
    return {
      ...rest,
      variants,
      url: this.s3.presign(storageKey, { method: 'GET', expiresIn: 3600 }),
    };
  }

  async createUpload(orgId: string, body: CreateUploadBody, actor: Actor) {
    const assetId = uuidv7();
    const ext = MIME_EXTENSIONS[body.mime] ?? 'bin';
    const storageKey = `orgs/${orgId}/assets/${assetId}/original.${ext}`;

    await this.repo.insert(orgId, {
      id: assetId,
      kind: body.kind,
      mime: body.mime,
      bytes: body.bytes,
      storageKey,
      variants: {},
      status: 'pending',
      createdBy: actor.userId,
    });

    const uploadUrl = this.s3.presign(storageKey, {
      method: 'PUT',
      expiresIn: 900,
      type: body.mime,
    });

    return {
      assetId,
      uploadUrl,
      headers: {
        'content-type': body.mime,
      },
    };
  }

  async completeUpload(orgId: string, assetId: string, body: CompleteUploadBody) {
    const asset = await this.repo.findById(orgId, assetId);
    if (!asset) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Asset not found' });
    }
    if (asset.status !== 'pending') {
      return this.toSummary(asset);
    }

    const stat = await this.s3
      .file(asset.storageKey)
      .stat()
      .catch(() => null);
    if (!stat) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Uploaded object not found in storage',
      });
    }
    if (stat.size > MAX_ASSET_BYTES || Math.abs(stat.size - asset.bytes) > 0) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Uploaded object size does not match declared bytes',
      });
    }

    const cropSuffix = body.crop
      ? `-${body.crop.x}-${body.crop.y}-${body.crop.w}-${body.crop.h}`
      : '';
    await this.jobs.enqueue(
      'asset.process',
      {
        organizationId: orgId,
        assetId,
        crop: body.crop,
      },
      { jobId: `${assetId}${cropSuffix}` },
    );

    return this.toSummary(asset);
  }

  async list(orgId: string, query: ListQuery) {
    const page = await this.repo.list(orgId, query);
    return {
      items: page.items.map((item) => this.toSummary(item)),
      nextCursor: page.nextCursor,
    };
  }

  async get(orgId: string, assetId: string) {
    const asset = await this.repo.findById(orgId, assetId);
    if (!asset) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Asset not found' });
    }
    return this.toSummary(asset);
  }

  async remove(orgId: string, assetId: string, actor: Actor) {
    const removed = await this.repo.transaction(async (tx) => {
      const row = await this.repo.delete(orgId, assetId, tx);
      if (row) {
        await this.audit.record(
          {
            organizationId: orgId,
            actorType: 'user',
            actorId: actor.userId,
            action: 'asset.delete',
            targetType: 'asset',
            targetId: assetId,
            ip: actor.ip,
          },
          tx,
        );
      }
      return row;
    });

    if (!removed) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Asset not found' });
    }

    const keys = [
      removed.storageKey,
      ...Object.values((removed.variants ?? {}) as AssetVariants)
        .map((v) => v?.key)
        .filter((k): k is string => typeof k === 'string'),
    ];
    await Promise.allSettled(keys.map((key) => this.s3.delete(key)));

    return { ok: true as const };
  }
}
