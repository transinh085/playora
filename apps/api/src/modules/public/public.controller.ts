import { Controller, Headers, Inject, Ip } from '@nestjs/common';
import { normalizeIp } from '@nestjs/throttler';
import { publicApi, type RouteArgs } from '@playora/contracts';
import type { Database } from '@playora/db';
import type { ApiEnv } from '@playora/env';
import { Args, Route } from '../../common/contract/route.decorator';
import { DB, ENV } from '../../infra/tokens';
import { AssetsService } from '../assets/assets.service';
import { PublicRepository } from './public.repository';
import { PublicService } from './public.service';

export const PUBLIC_THROTTLER = 'public';
export const PUBLIC_JOIN_DEVICE_THROTTLER = 'publicJoinDevice';
export const PUBLIC_JOIN_DEVICE_LIMIT_PER_MIN = 20;

export function getPublicJoinDeviceTracker(req: Record<string, unknown>): string {
  const rawIp = typeof req.ip === 'string' && req.ip.length > 0 ? req.ip : 'unknown';
  const ip = normalizeIp(rawIp);
  const body = req.body as { deviceId?: unknown } | undefined;
  const rawDeviceId = body?.deviceId;
  const deviceId =
    typeof rawDeviceId === 'string' && rawDeviceId.trim().length > 0
      ? rawDeviceId.trim().slice(0, 128)
      : 'missing';
  return `${ip}:${deviceId}`;
}

/**
 * Public player endpoints (`/p/:slug`, `/p/:slug/join`).
 * Skips the default 300/min per-IP throttler so hundreds of phones behind venue NAT can join;
 * applies a high per-IP limit (`PUBLIC_RATE_LIMIT_PER_MIN`) plus a per-(IP + deviceId) bucket on join.
 * Rate limit tiers are declared on the contracts (`publicApi.event`, `publicApi.join`).
 */
@Controller()
export class PublicController {
  private readonly publicService: PublicService;

  constructor(@Inject(DB) db: Database, @Inject(ENV) env: ApiEnv, assets: AssetsService) {
    this.publicService = new PublicService(new PublicRepository(db), assets, env);
  }

  @Route(publicApi.event)
  event(@Args() { params }: RouteArgs<typeof publicApi.event>) {
    return this.publicService.getEvent(params.slug);
  }

  @Route(publicApi.join)
  join(
    @Args() { params, body }: RouteArgs<typeof publicApi.join>,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.publicService.join(params.slug, body, { ip, userAgent });
  }
}
