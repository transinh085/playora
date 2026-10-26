import { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * - `public`: no auth (player shell, health)
 * - `session`: organizer signed in via Better Auth
 * - `player`: event-scoped player token (M1)
 */
export type RouteAuth = 'public' | 'session' | 'player';

/** Shape of an org permission check; mirrors `@playora/auth` statements without depending on it. */
export type RoutePermission = Record<string, readonly string[]>;

/**
 * - `public` / `publicJoinDevice`: shared per-IP throttlers in the API.
 * - `campaign`: no shared throttler; the campaign's anti-fraud level sets the limits
 *   (docs/engineering/security.md §1.3), so a café full of guests on one IP is not blocked.
 */
export type RouteRateLimit = 'public' | 'publicJoinDevice' | 'campaign';

export interface RouteDef {
  method: HttpMethod;
  /** Express-style path without the `/v1` prefix, e.g. `/orgs/:orgId/events/:eventId`. */
  path: string;
  summary: string;
  tags: readonly string[];
  auth: RouteAuth;
  /** Required org permission; implies `:orgId` in the path. */
  permission?: RoutePermission;
  /**
   * Platform back-office route (internal staff listed in `PLATFORM_ADMIN_EMAILS`); needs
   * `auth: 'session'` and is enforced by the API guard pipeline, never in controllers.
   */
  platformAdmin?: boolean;
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  response: z.ZodType;
  /** HTTP status on success (default 200). */
  status?: number;
  /** Optional rate limit tier, see `RouteRateLimit`. */
  rateLimit?: RouteRateLimit;
}

export function defineRoute<const R extends RouteDef>(route: R): R {
  return route;
}

type InputOf<S> = S extends z.ZodType ? z.input<S> : never;
type OutputOf<S> = S extends z.ZodType ? z.output<S> : never;
// A part becomes optional for the caller when every field in it is optional (e.g. paging query).
type Field<K extends string, S> = S extends z.ZodType
  ? // biome-ignore lint/complexity/noBannedTypes: `{} extends T` is the "all fields optional" check.
    {} extends InputOf<S>
    ? { [P in K]?: InputOf<S> }
    : { [P in K]: InputOf<S> }
  : { [P in K]?: never };

/** What a client sends for a route. */
export type RouteInput<R extends RouteDef> = Field<'params', R['params']> &
  Field<'query', R['query']> &
  Field<'body', R['body']>;

/** What a handler receives after validation. */
export interface RouteArgs<R extends RouteDef> {
  params: OutputOf<R['params']>;
  query: OutputOf<R['query']>;
  body: OutputOf<R['body']>;
}

export type RouteResponse<R extends RouteDef> = z.output<R['response']>;

/** `/orgs/:orgId/events` + `{ orgId: 'x' }` → `/orgs/x/events` */
export function buildPath(path: string, params: Record<string, unknown> = {}): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined || value === null) throw new Error(`Missing path param "${key}"`);
    return encodeURIComponent(String(value));
  });
}
