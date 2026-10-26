import { ForbiddenException, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { normalizeIp } from '@nestjs/throttler';
import { type CampaignRules, ErrorCode } from '@playora/contracts';
import type { ApiEnv } from '@playora/env';
import type { Redis } from 'ioredis';
import { ENV, REDIS } from '../../infra/tokens';
import { TURNSTILE_VERIFIER, type TurnstileVerifier } from './turnstile';

export type AntiFraudLevel = CampaignRules['antiFraud'];

/**
 * Rate limits per anti-fraud level (docs/product/specs/participation.md §4), fixed one-minute
 * windows in Valkey, counted per campaign. A café's guests share one public IP (NAT), so IP limits
 * stay loose and the per-player / per-device limits do the real work: a real guest joins once and
 * plays a few turns a day; a script hammering one session or device hits those first.
 * Per-device on plays is per-player: one device is one player (unique `players.device_id`).
 */
export const ANTI_FRAUD_LIMITS = {
  low: {
    playsPerIp: 600,
    joinsPerIp: 600,
  },
  standard: {
    playsPerPlayer: 20,
    playsPerIp: 120,
    joinsPerIp: 30,
    joinsPerDevice: 5,
  },
} as const satisfies Record<AntiFraudLevel, Record<string, number>>;

export const ANTI_FRAUD_WINDOW_S = 60;
/** A solved Turnstile challenge covers the player's session for this long. */
export const CAPTCHA_VERIFIED_TTL_S = 12 * 60 * 60;

// KEYS: counter · ARGV: window seconds → hits in the current window
const HIT = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n
`;

/** Events built before campaigns (guest lists, internal) carry no level: treat them as `low`. */
export function antiFraudLevelOf(eventAntiFraud: unknown): AntiFraudLevel {
  const level = (eventAntiFraud as { level?: unknown } | null)?.level;
  return level === 'standard' ? 'standard' : 'low';
}

/**
 * Anti-fraud gate for public player routes (EVT-13, M1 levels "Thấp" and "Chuẩn"): rate limits by
 * IP, player and device, and Cloudflare Turnstile once per player session on `standard`.
 */
@Injectable()
export class AntiFraudService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(ENV) private readonly env: ApiEnv,
    @Inject(TURNSTILE_VERIFIER) private readonly turnstile: TurnstileVerifier,
  ) {}

  /** Site key for the player shell when this level asks for a challenge; null otherwise. */
  captchaSiteKey(level: AntiFraudLevel): string | null {
    if (level !== 'standard' || !this.env.TURNSTILE_SECRET_KEY) return null;
    return this.env.TURNSTILE_SITE_KEY ?? null;
  }

  async checkJoin(input: {
    level: AntiFraudLevel;
    eventId: string;
    ip: string;
    deviceId: string;
  }): Promise<void> {
    const ip = normalizeIp(input.ip || 'unknown');
    const scope = `af:join:${input.eventId}`;
    if (input.level === 'low') {
      await this.limit(`${scope}:ip:${ip}`, ANTI_FRAUD_LIMITS.low.joinsPerIp);
      return;
    }
    const limits = ANTI_FRAUD_LIMITS.standard;
    await this.limit(`${scope}:ip:${ip}`, limits.joinsPerIp);
    await this.limit(`${scope}:device:${input.deviceId.slice(0, 128)}`, limits.joinsPerDevice);
  }

  async checkPlay(input: {
    level: AntiFraudLevel;
    eventId: string;
    playerId: string;
    ip: string;
    captchaToken?: string;
  }): Promise<void> {
    const ip = normalizeIp(input.ip || 'unknown');
    const scope = `af:play:${input.eventId}`;
    if (input.level === 'low') {
      await this.limit(`${scope}:ip:${ip}`, ANTI_FRAUD_LIMITS.low.playsPerIp);
      return;
    }
    const limits = ANTI_FRAUD_LIMITS.standard;
    await this.limit(`${scope}:player:${input.playerId}`, limits.playsPerPlayer);
    await this.limit(`${scope}:ip:${ip}`, limits.playsPerIp);
    if (this.env.TURNSTILE_SECRET_KEY) {
      await this.requireHuman(input.eventId, input.playerId, ip, input.captchaToken);
    }
  }

  /** Turnstile once per player session: a solved challenge is remembered for 12 h. */
  private async requireHuman(eventId: string, playerId: string, ip: string, token?: string) {
    const key = `af:human:${eventId}:${playerId}`;
    if (await this.redis.exists(key)) return;
    if (!token || !(await this.turnstile.verify(token, ip))) {
      throw new ForbiddenException({
        code: ErrorCode.CAPTCHA_REQUIRED,
        message: token ? 'Captcha verification failed' : 'Captcha required',
      });
    }
    await this.redis.set(key, '1', 'EX', CAPTCHA_VERIFIED_TTL_S);
  }

  private async limit(key: string, max: number) {
    const hits = Number(await this.redis.eval(HIT, 1, key, ANTI_FRAUD_WINDOW_S));
    if (hits > max) {
      throw new HttpException(
        {
          code: ErrorCode.RATE_LIMITED,
          message: 'Too many requests, please retry in a moment',
          details: { retryAfterS: ANTI_FRAUD_WINDOW_S },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
