import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/**
 * Signed player session tokens (ADR-012 §2). Issued by the API on join, verified by Play API
 * endpoints with `PLAYER_SESSION_SECRET`. Format: `base64url(json).base64url(hmac)`.
 */
export const PlayerSessionClaims = z.object({
  kind: z.literal('player'),
  organizationId: z.string(),
  eventId: z.uuid(),
  /** players.id */
  sub: z.uuid(),
  displayName: z.string(),
  /** Session version for revocation (matches players.session_ver). */
  ver: z.number().int().nonnegative(),
  /** Expiry, unix seconds. */
  exp: z.number().int(),
});
export type PlayerSessionClaims = z.infer<typeof PlayerSessionClaims>;

/** Player session tokens last 24 hours by default. */
export const PLAYER_SESSION_TTL_S = 24 * 60 * 60;
export const PLAYER_TOKEN_TTL_S = PLAYER_SESSION_TTL_S;

const sign = (body: string, secret: string) =>
  createHmac('sha256', secret).update(body).digest('base64url');

export function signPlayerSession(claims: PlayerSessionClaims, secret: string): string {
  const body = Buffer.from(JSON.stringify(PlayerSessionClaims.parse(claims))).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** Returns the claims, or null when the token is malformed, tampered with or expired. */
export function verifyPlayerSession(
  token: string,
  secret: string,
  nowS = Math.floor(Date.now() / 1000),
): PlayerSessionClaims | null {
  const [body, mac, extra] = token.split('.');
  if (!body || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const claims = PlayerSessionClaims.safeParse(
      JSON.parse(Buffer.from(body, 'base64url').toString('utf8')),
    );
    return claims.success && claims.data.exp > nowS ? claims.data : null;
  } catch {
    return null;
  }
}
