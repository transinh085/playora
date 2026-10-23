import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { hasPermission, type PermissionRequest } from '@playora/auth';
import { ErrorCode } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq } from 'drizzle-orm';
import type { Request } from 'express';
import { DB } from '../../infra/tokens';
import { getRouteContract } from '../contract/route.decorator';

/**
 * Enforces the contract's `permission` for the `:orgId` in the path and exposes the membership.
 * Tenant isolation starts here; repositories still filter every query by organizationId.
 */
@Injectable()
export class OrgAccessGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: Database) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const route = getRouteContract(ctx);
    if (!route?.permission) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const orgId = req.params.orgId;
    const userId = req.session?.user.id;
    if (typeof orgId !== 'string' || !userId) throw this.forbidden();

    const { member } = schema;
    const [row] = await this.db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.organizationId, orgId), eq(member.userId, userId)))
      .limit(1);

    if (!row || !hasPermission(row.role, route.permission as PermissionRequest)) {
      throw this.forbidden();
    }
    req.membership = { organizationId: orgId, role: row.role };
    return true;
  }

  private forbidden() {
    return new ForbiddenException({
      code: ErrorCode.FORBIDDEN,
      message: 'Not allowed in this organization',
    });
  }
}
