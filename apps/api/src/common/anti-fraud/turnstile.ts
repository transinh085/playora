import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ApiEnv } from '@playora/env';
import { ENV } from '../../infra/tokens';

/** Injection token for the Turnstile verifier; tests swap in a fake so nothing hits the network. */
export const TURNSTILE_VERIFIER = Symbol('TURNSTILE_VERIFIER');

export interface TurnstileVerifier {
  /** True when Cloudflare accepts the token (single use, ~5 min validity). */
  verify(token: string, remoteIp?: string): Promise<boolean>;
}

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5_000;

/** Server-side check of a Cloudflare Turnstile token (docs/engineering/security.md §1). */
@Injectable()
export class CloudflareTurnstileVerifier implements TurnstileVerifier {
  private readonly logger = new Logger(CloudflareTurnstileVerifier.name);

  constructor(@Inject(ENV) private readonly env: ApiEnv) {}

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    const secret = this.env.TURNSTILE_SECRET_KEY;
    if (!secret) return true;
    const form = new URLSearchParams({ secret, response: token });
    if (remoteIp) form.set('remoteip', remoteIp);
    try {
      const res = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        this.logger.warn(`Turnstile siteverify answered ${res.status}`);
        return false;
      }
      const body = (await res.json()) as { success?: boolean };
      return body.success === true;
    } catch (err) {
      // Fail closed: the player can retry with a fresh challenge.
      this.logger.warn(
        `Turnstile siteverify failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}
