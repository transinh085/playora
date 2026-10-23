import {
  type ApiErrorBody,
  buildPath,
  ErrorCode,
  type RouteDef,
  type RouteInput,
  type RouteResponse,
} from '@playora/contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Avoid DOM-only global type names so the client also typechecks in server (non-DOM) projects.
type HeadersLike = ConstructorParameters<typeof Headers>[0];

export type FetchLike = (input: URL, init: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  /** API origin, e.g. http://localhost:4000 — `/v1` is appended. */
  baseUrl: string;
  fetch?: FetchLike;
  /** Static or per-request headers (server components forward the session cookie here). */
  headers?: HeadersLike | (() => HeadersLike | Promise<HeadersLike>);
  /** Browser cookies for the Better Auth session (default `include`). */
  credentials?: RequestInit['credentials'];
}

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Contract-driven client: `api.call(eventsApi.list, { params: { orgId }, query: { limit: 20 } })`.
 * Inputs and outputs are typed from the zod route definitions in @playora/contracts.
 */
export function createApiClient(options: ApiClientOptions) {
  const doFetch: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
  const root = `${options.baseUrl.replace(/\/$/, '')}/v1`;

  async function call<R extends RouteDef>(
    route: R,
    // Input is optional only when the route has no params, query or body to send.
    // biome-ignore lint/complexity/noBannedTypes: `{} extends T` is the "all fields optional" check.
    ...[input]: {} extends RouteInput<R> ? [input?: RouteInput<R>] : [input: RouteInput<R>]
  ): Promise<RouteResponse<R>> {
    const { params, query, body } = (input ?? {}) as {
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      body?: unknown;
    };

    const url = new URL(root + buildPath(route.path, params));
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    const extra = typeof options.headers === 'function' ? await options.headers() : options.headers;
    const headers = new Headers(extra);
    headers.set('accept', 'application/json');
    if (body !== undefined) headers.set('content-type', 'application/json');

    const res = await doFetch(url, {
      method: route.method,
      headers,
      credentials: options.credentials ?? 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const payload: unknown =
      res.status === 204 ? undefined : await res.json().catch(() => undefined);
    if (!res.ok) {
      const error = (payload as Partial<ApiErrorBody> | undefined)?.error;
      throw new ApiError(
        res.status,
        error?.code ?? ErrorCode.INTERNAL,
        error?.message ?? res.statusText,
        error?.details,
        error?.requestId,
      );
    }
    return payload as RouteResponse<R>;
  }

  return { call };
}

/** Stable TanStack Query key for a route + input. */
export function routeKey<R extends RouteDef>(route: R, input?: RouteInput<R>) {
  return [route.method, route.path, input ?? {}] as const;
}
