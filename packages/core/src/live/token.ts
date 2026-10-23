import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/**
 * Short-lived tokens for the realtime handshake (docs/07 §4.1). Issued by the API, verified by
 * apps/realtime with the shared `LIVE_TOKEN_SECRET`. Format: `base64url(json).base64url(hmac)`.
 * Screens do not use these: they authenticate with a raw screen key, looked up by `hashScreenKey`.
 */
export const LiveTokenClaims = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('player'),
    organizationId: z.string(),
    eventId: z.uuid(),
    /** players.id */
    sub: z.uuid(),
    displayName: z.string(),
    team: z.string().nullable(),
    env: z.enum(['live', 'rehearsal']),
    /** Expiry, unix seconds. */
    exp: z.number().int(),
  }),
  z.object({
    kind: z.literal('host'),
    organizationId: z.string(),
    eventId: z.uuid(),
    /** user.id of the operator. */
    sub: z.string(),
    exp: z.number().int(),
  }),
]);
export type LiveTokenClaims = z.infer<typeof LiveTokenClaims>;

/** Player tokens last the whole event day; host tickets are fetched right before connecting. */
export const PLAYER_TOKEN_TTL_S = 24 * 60 * 60;
export const HOST_TICKET_TTL_S = 5 * 60;

const sign = (body: string, secret: string) =>
  createHmac('sha256', secret).update(body).digest('base64url');

export function signLiveToken(claims: LiveTokenClaims, secret: string): string {
  const body = Buffer.from(JSON.stringify(LiveTokenClaims.parse(claims))).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** Returns the claims, or null when the token is malformed, tampered with or expired. */
export function verifyLiveToken(
  token: string,
  secret: string,
  nowS = Math.floor(Date.now() / 1000),
): LiveTokenClaims | null {
  const [body, mac, extra] = token.split('.');
  if (!body || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const claims = LiveTokenClaims.safeParse(
      JSON.parse(Buffer.from(body, 'base64url').toString('utf8')),
    );
    return claims.success && claims.data.exp > nowS ? claims.data : null;
  } catch {
    return null;
  }
}

/** event_screens.screenKeyHash = sha256 hex of the raw key shown once in Studio. */
export function hashScreenKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}
