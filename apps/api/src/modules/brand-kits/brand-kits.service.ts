import { Injectable, NotFoundException } from '@nestjs/common';
import { type brandKitsApi, ErrorCode, type RouteArgs } from '@playora/contracts';
import { AuditService } from '../../common/audit/audit.service';
import { BrandKitsRepository } from './brand-kits.repository';

type ListQuery = RouteArgs<typeof brandKitsApi.list>['query'];
type CreateBody = RouteArgs<typeof brandKitsApi.create>['body'];
type UpdateBody = RouteArgs<typeof brandKitsApi.update>['body'];

export interface Actor {
  userId: string;
  ip?: string;
}

@Injectable()
export class BrandKitsService {
  constructor(
    private readonly repo: BrandKitsRepository,
    private readonly audit: AuditService,
  ) {}

  list(orgId: string, query: ListQuery) {
    return this.repo.list(orgId, query);
  }

  async get(orgId: string, brandKitId: string) {
    const brandKit = await this.repo.findById(orgId, brandKitId);
    if (!brandKit) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Brand kit not found' });
    }
    return brandKit;
  }

  async create(orgId: string, body: CreateBody) {
    return this.repo.insert(orgId, {
      name: body.name,
      clientId: body.clientId ?? null,
      tokens: body.tokens,
    });
  }

  async update(orgId: string, brandKitId: string, body: UpdateBody) {
    const updated = await this.repo.update(orgId, brandKitId, {
      name: body.name,
      clientId: body.clientId,
      tokens: body.tokens,
    });
    if (!updated) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Brand kit not found' });
    }
    return updated;
  }

  async remove(orgId: string, brandKitId: string, actor: Actor) {
    const removed = await this.repo.transaction(async (tx) => {
      const row = await this.repo.delete(orgId, brandKitId, tx);
      if (row) {
        await this.audit.record(
          {
            organizationId: orgId,
            actorType: 'user',
            actorId: actor.userId,
            action: 'brand_kit.delete',
            targetType: 'brand_kit',
            targetId: brandKitId,
            ip: actor.ip,
          },
          tx,
        );
      }
      return row;
    });
    if (!removed) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Brand kit not found' });
    }
    return { ok: true as const };
  }
}
