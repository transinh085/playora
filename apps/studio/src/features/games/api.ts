'use client';

import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import { gamesApi, type RouteDef, templatesApi } from '@playora/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type RouteMutationOptions<R extends RouteDef> = Parameters<typeof useRouteMutation<R>>[2];

export function useGames(orgId: string, eventId: string) {
  return useRouteQuery(api, gamesApi.list, { params: { orgId, eventId } });
}

export function useGame(orgId: string, gameId: string) {
  return useRouteQuery(api, gamesApi.get, { params: { orgId, gameId } });
}

export function useGameVersions(orgId: string, gameId: string) {
  return useRouteQuery(api, gamesApi.listVersions, { params: { orgId, gameId } });
}

export function useTemplates() {
  return useRouteQuery(api, templatesApi.list, {});
}

export function useCreateGame(options?: RouteMutationOptions<typeof gamesApi.create>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, gamesApi.create, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateGame(options?: RouteMutationOptions<typeof gamesApi.update>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, gamesApi.update, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.get) });
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}

export function usePublishGame(options?: RouteMutationOptions<typeof gamesApi.publish>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, gamesApi.publish, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.get) });
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.listVersions) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useReorderGames(options?: RouteMutationOptions<typeof gamesApi.reorder>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, gamesApi.reorder, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useRemoveGame(options?: RouteMutationOptions<typeof gamesApi.remove>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, gamesApi.remove, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}
