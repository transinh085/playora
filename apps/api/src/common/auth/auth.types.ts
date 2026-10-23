import type { Auth } from '@playora/auth';

export type AuthSession = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;

export interface OrgMembership {
  organizationId: string;
  role: string;
}

declare module 'express' {
  interface Request {
    session?: AuthSession;
    membership?: OrgMembership;
  }
}
