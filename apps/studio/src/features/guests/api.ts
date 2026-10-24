'use client';

import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import { guestsApi, type RouteDef } from '@playora/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type RouteMutationOptions<R extends RouteDef> = Parameters<typeof useRouteMutation<R>>[2];

export function useGuests(
  orgId: string,
  eventId: string,
  filters?: { limit?: number; search?: string; team?: string },
) {
  return useRouteQuery(api, guestsApi.list, {
    params: { orgId, eventId },
    query: {
      limit: filters?.limit ?? 50,
      search: filters?.search,
      team: filters?.team,
    },
  });
}

export function useGuestTeams(orgId: string, eventId: string) {
  return useRouteQuery(api, guestsApi.listTeams, { params: { orgId, eventId } });
}

export function usePreviewGuests(options?: RouteMutationOptions<typeof guestsApi.preview>) {
  return useRouteMutation(api, guestsApi.preview, options);
}

export function useImportGuests(options?: RouteMutationOptions<typeof guestsApi.import>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, guestsApi.import, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.listTeams) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useRemoveGuest(options?: RouteMutationOptions<typeof guestsApi.remove>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, guestsApi.remove, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.listTeams) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useReleaseGuestDevice(
  options?: RouteMutationOptions<typeof guestsApi.releaseDevice>,
) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, guestsApi.releaseDevice, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useClearGuests(options?: RouteMutationOptions<typeof guestsApi.clear>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, guestsApi.clear, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.listTeams) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useAssignRandomTeams(options?: RouteMutationOptions<typeof guestsApi.assignTeams>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, guestsApi.assignTeams, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.listTeams) });
      options?.onSuccess?.(...args);
    },
  });
}
