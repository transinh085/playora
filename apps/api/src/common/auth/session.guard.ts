import { createHash } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Auth } from '@playora/auth';
import { ErrorCode } from '@playora/contracts';
import { verifyPlayerSession } from '@playora/core/session';
import { type Database, schema } from '@playora/db';
import type { ApiEnv } from '@playora/env';
import { fromNodeHeaders } from 'better-auth/node';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { AUTH, DB, ENV } from '../../infra/tokens';
import { getRouteContract } from '../contract/route.decorator';
import type { AuthSession } from './auth.types';
import { IS_PUBLIC } from './decorators';

/**
 * Counter device tokens are scoped strictly to `voucher: ['read', 'redeem']` (ADR-017, ORG-10).
 */
export function isAllowedCounterDevicePermission(permission: unknown): boolean {
  if (!permission || typeof permission !== 'object') return false;
  const entries = Object.entries(permission as Record<string, unknown>);
  if (entries.length === 0) return false;
  return entries.every(
    ([resource, actions]) =>
      resource === 'voucher' &&
      Array.isArray(actions) &&
      actions.length > 0 &&
      actions.every((a) => a === 'read' || a === 'redeem'),
  );
}

function readCounterDeviceHeader(req: Request): string | null {
  const header = req.headers['x-counter-device-token'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  return null;
}

function readCounterDeviceCookie(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader === 'string') {
    for (const part of cookieHeader.split(';')) {
      const [rawKey, ...rest] = part.trim().split('=');
      if (rawKey === 'playora_counter_device') {
        const value = rest.join('=').trim();
        if (value) return decodeURIComponent(value);
      }
    }
  }
  return null;
}

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
    @Inject(DB) private readonly db: Database,
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

    const headerDeviceToken = readCounterDeviceHeader(req);
    if (headerDeviceToken && isAllowedCounterDevicePermission(route?.permission)) {
      return this.activateCounterDevice(req, route, headerDeviceToken);
    }

    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (session) {
      req.session = session;
      return true;
    }

    const deviceToken = headerDeviceToken ?? readCounterDeviceCookie(req);
    if (deviceToken) {
      return this.activateCounterDevice(req, route, deviceToken);
    }

    throw new UnauthorizedException({
      code: ErrorCode.UNAUTHORIZED,
      message: 'Sign in required',
    });
  }

  private async activateCounterDevice(
    req: Request,
    route: ReturnType<typeof getRouteContract>,
    deviceToken: string,
  ): Promise<boolean> {
    const tokenHash = createHash('sha256').update(deviceToken).digest('hex');
    const { counterDevices } = schema;
    const [device] = await this.db
      .select({
        id: counterDevices.id,
        organizationId: counterDevices.organizationId,
        label: counterDevices.label,
        storeLabel: counterDevices.storeLabel,
        createdBy: counterDevices.createdBy,
        revokedAt: counterDevices.revokedAt,
      })
      .from(counterDevices)
      .where(eq(counterDevices.tokenHash, tokenHash))
      .limit(1);

    if (!device || device.revokedAt !== null) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Counter device token invalid or revoked',
      });
    }

    if (!isAllowedCounterDevicePermission(route?.permission)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Counter device token is scoped to voucher read and redeem only',
      });
    }

    req.counterDevice = {
      id: device.id,
      organizationId: device.organizationId,
      label: device.label,
      storeLabel: device.storeLabel ?? null,
      createdBy: device.createdBy,
    };
    req.session = {
      user: {
        id: device.createdBy,
        name: device.label,
        email: '',
      },
      session: {
        id: device.id,
      },
    } as unknown as AuthSession;
    return true;
  }
}
