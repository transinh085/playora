import type { Auth } from '@playora/auth';
import type { PlayerSessionClaims } from '@playora/core/session';

export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;

export interface OrgMembership {
  organizationId: string;
  role: string;
}

declare module 'express' {
  interface Request {
    session?: AuthSession;
    membership?: OrgMembership;
    /** Verified player session claims on `auth: 'player'` routes. */
    player?: PlayerSessionClaims;
  }
}
