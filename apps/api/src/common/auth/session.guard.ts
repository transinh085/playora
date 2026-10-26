import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Auth } from '@playora/auth';
import { ErrorCode } from '@playora/contracts';
import { verifyPlayerSession } from '@playora/core/session';
import type { ApiEnv } from '@playora/env';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { AUTH, ENV } from '../../infra/tokens';
import { getRouteContract } from '../contract/route.decorator';
import { IS_PUBLIC } from './decorators';

/**
 * Secure by default: every handler needs a Better Auth session unless marked public. Player
 * routes (`auth: 'player'`) need a player session token (`Authorization: Bearer <token>`, signed
 * on join); the handler still checks that the token's campaign matches the route.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(ENV) private readonly env: ApiEnv,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const route = getRouteContract(ctx);
    const isPublic =
      route?.auth === 'public' ||
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    if (route?.auth === 'player') {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
      const claims = token ? verifyPlayerSession(token, this.env.PLAYER_SESSION_SECRET) : null;
      if (!claims) {
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          message: 'Player session required',
        });
      }
      req.player = claims;
      return true;
    }

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
