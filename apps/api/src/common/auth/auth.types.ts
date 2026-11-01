import type { Auth } from '@playora/auth';
import type { PlayerSessionClaims } from '@playora/core/session';

export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;

export interface OrgMembership {
  organizationId: string;
  role: string;
}

export interface CounterDeviceActor {
  id: string;
  organizationId: string;
  label: string;
  storeLabel: string | null;
  createdBy: string;
}

declare module 'express' {
  interface Request {
    session?: AuthSession;
    membership?: OrgMembership;
    /** Verified counter device when authenticated via `x-counter-device-token` (ADR-017). */
    counterDevice?: CounterDeviceActor;
    /** Verified player session claims on `auth: 'player'` routes. */
    player?: PlayerSessionClaims;
  }
}
