'use client';

import type { RouteDef, RouteInput, RouteResponse } from '@playora/contracts';
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { type ApiClient, ApiError, routeKey } from './index';

/** `useRouteQuery(api, eventsApi.list, { params: { orgId } })` — cached by route + input. */
export function useRouteQuery<R extends RouteDef>(
  api: ApiClient,
  route: R,
  input: RouteInput<R>,
  options?: Omit<UseQueryOptions<RouteResponse<R>, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<RouteResponse<R>, ApiError>({
    queryKey: routeKey(route, input) as unknown as QueryKey,
    queryFn: () =>
      (api.call as (r: R, i: RouteInput<R>) => Promise<RouteResponse<R>>)(route, input),
    ...options,
  });
}

export function useRouteMutation<R extends RouteDef, TContext = unknown>(
  api: ApiClient,
  route: R,
  options?: Omit<
    UseMutationOptions<RouteResponse<R>, ApiError, RouteInput<R>, TContext>,
    'mutationFn'
  >,
) {
  return useMutation<RouteResponse<R>, ApiError, RouteInput<R>, TContext>({
    mutationFn: (input) =>
      (api.call as (r: R, i: RouteInput<R>) => Promise<RouteResponse<R>>)(route, input),
    ...options,
  });
}

/** Key prefix to invalidate every cached call of a route, e.g. after creating an event. */
export function routePrefix(route: RouteDef) {
  return [route.method, route.path] as const;
}

export { ApiError };
