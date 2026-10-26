import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ErrorCode } from '@playora/contracts';
import type { ApiEnv } from '@playora/env';
import type { Request } from 'express';
import { ENV } from '../../infra/tokens';
import { getRouteContract } from '../contract/route.decorator';

/**
 * Enforces `platformAdmin: true` routes (back-office, BIL-01): the signed-in user's email must be
 * in `PLATFORM_ADMIN_EMAILS` and verified, so nobody can sign up with a staff address that has not
 * registered yet and inherit its rights. Runs after `SessionGuard`.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  private readonly emails: ReadonlySet<string>;

  constructor(@Inject(ENV) env: ApiEnv) {
    this.emails = new Set(env.PLATFORM_ADMIN_EMAILS);
  }

  canActivate(ctx: ExecutionContext): boolean {
    const route = getRouteContract(ctx);
    if (!route?.platformAdmin) return true;
    const user = ctx.switchToHttp().getRequest<Request>().session?.user;
    if (!user?.emailVerified || !this.emails.has(user.email.toLowerCase())) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Playora staff only',
      });
    }
    return true;
  }
}
