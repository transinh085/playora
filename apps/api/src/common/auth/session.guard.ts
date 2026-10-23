import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Auth } from '@playora/auth';
import { ErrorCode } from '@playora/contracts';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { AUTH } from '../../infra/tokens';
import { getRouteContract } from '../contract/route.decorator';
import { IS_PUBLIC } from './decorators';

/** Secure by default: every handler needs a Better Auth session unless marked public. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const route = getRouteContract(ctx);
    const isPublic =
      route?.auth === 'public' ||
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    if (route?.auth === 'player') {
      throw new NotImplementedException({
        code: ErrorCode.INTERNAL,
        message: 'Player auth lands in M1',
      });
    }

    const req = ctx.switchToHttp().getRequest<Request>();
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Sign in required',
      });
    }
    req.session = session;
    return true;
  }
}
