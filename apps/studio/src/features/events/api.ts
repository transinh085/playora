'use client';

import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import { eventsApi, type RouteDef } from '@playora/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type RouteQueryOptions<R extends RouteDef> = Parameters<typeof useRouteQuery<R>>[3];
type RouteMutationOptions<R extends RouteDef> = Parameters<typeof useRouteMutation<R>>[2];

export function useEvents(orgId: string, limit = 50) {
  return useRouteQuery(api, eventsApi.list, { params: { orgId }, query: { limit } });
}

export function useEvent(
  orgId: string,
  eventId: string,
  options?: RouteQueryOptions<typeof eventsApi.get>,
) {
  return useRouteQuery(api, eventsApi.get, { params: { orgId, eventId } }, options);
}

export function useCreateEvent(options?: RouteMutationOptions<typeof eventsApi.create>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, eventsApi.create, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(eventsApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateEvent(options?: RouteMutationOptions<typeof eventsApi.update>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, eventsApi.update, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(eventsApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(eventsApi.get) });
      options?.onSuccess?.(...args);
    },
  });
}
