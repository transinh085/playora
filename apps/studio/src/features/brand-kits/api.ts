'use client';

import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import { brandKitsApi, type RouteDef } from '@playora/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type RouteMutationOptions<R extends RouteDef> = Parameters<typeof useRouteMutation<R>>[2];

export function useBrandKits(orgId: string, limit = 50) {
  return useRouteQuery(api, brandKitsApi.list, { params: { orgId }, query: { limit } });
}

export function useCreateBrandKit(options?: RouteMutationOptions<typeof brandKitsApi.create>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, brandKitsApi.create, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(brandKitsApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateBrandKit(options?: RouteMutationOptions<typeof brandKitsApi.update>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, brandKitsApi.update, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(brandKitsApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useRemoveBrandKit(options?: RouteMutationOptions<typeof brandKitsApi.remove>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, brandKitsApi.remove, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(brandKitsApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}
