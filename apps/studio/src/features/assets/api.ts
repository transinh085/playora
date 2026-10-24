'use client';

import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import { type AssetKind, assetsApi, type RouteDef } from '@playora/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

type RouteMutationOptions<R extends RouteDef> = Parameters<typeof useRouteMutation<R>>[2];

export function useAssets(orgId: string, filters?: { limit?: number; kind?: AssetKind }) {
  return useRouteQuery(api, assetsApi.list, {
    params: { orgId },
    query: { limit: filters?.limit ?? 50, ...(filters?.kind && { kind: filters.kind }) },
  });
}

export function useRemoveAsset(options?: RouteMutationOptions<typeof assetsApi.remove>) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, assetsApi.remove, {
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(assetsApi.list) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useInvalidateAssets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: routePrefix(assetsApi.list) });
}
