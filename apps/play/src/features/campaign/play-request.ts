import { ApiError } from '@playora/api-client';

/**
 * Network failures and 5xx may have reached the server: the play could be recorded even though
 * the answer was lost. Those are retried with the **same** request id so the server returns the
 * first result instead of playing twice. A 4xx is a definite answer.
 */
export function isTransientPlayError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status >= 500 || error.status === 408;
}

export function isRateLimitedError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 429 || error.code === 'RATE_LIMITED');
}

export function isCaptchaRequiredError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.code === 'CAPTCHA_REQUIRED';
}

export interface PlayRequesterOptions<T> {
  /** Sends one play with this idempotency key. */
  send: (requestId: string) => Promise<T>;
  newId?: () => string;
  /** Automatic retries of a transient failure within one tap. */
  retries?: number;
  wait?: (ms: number) => Promise<void>;
}

/**
 * One idempotency key per tap (`StartPlayBody.requestId`). The key is kept until the server gives
 * a definite answer: automatic retries reuse it, and so does the player's next tap after a
 * network failure, because the first attempt may already have been played.
 */
export class PlayRequester<T> {
  private pending: string | null = null;
  private readonly send: (requestId: string) => Promise<T>;
  private readonly newId: () => string;
  private readonly retries: number;
  private readonly wait: (ms: number) => Promise<void>;

  constructor(options: PlayRequesterOptions<T>) {
    this.send = options.send;
    this.newId = options.newId ?? (() => crypto.randomUUID());
    this.retries = options.retries ?? 2;
    this.wait = options.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  /** The key the next attempt will use (null when the next tap starts fresh). */
  get pendingRequestId(): string | null {
    return this.pending;
  }

  async play(): Promise<T> {
    const requestId = this.pending ?? this.newId();
    this.pending = requestId;
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await this.send(requestId);
        this.pending = null;
        return result;
      } catch (error) {
        if (isRateLimitedError(error) || isCaptchaRequiredError(error)) {
          // Keep the request ID for the next tap or challenge retry; do not auto-retry immediately in the loop
          throw error;
        }
        if (!isTransientPlayError(error)) {
          this.pending = null;
          throw error;
        }
        // Out of automatic retries: keep the key so the next tap retries the same play.
        if (attempt >= this.retries) throw error;
        await this.wait(500 * 2 ** attempt);
      }
    }
  }
}
