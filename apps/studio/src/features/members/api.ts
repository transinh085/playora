'use client';

import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import { counterDevicesApi, meApi } from '@playora/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

export const orgMembersQueryKey = (orgId: string) => ['auth', 'org-full', orgId] as const;

export function useOrgMembers(orgId: string, enabled = true) {
  return useQuery({
    queryKey: orgMembersQueryKey(orgId),
    queryFn: async () => {
      const { data, error } = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      if (error || !data) throw new Error(error?.message ?? 'Failed to load organization');
      return data;
    },
    enabled: Boolean(orgId) && enabled,
  });
}

export function useInvalidateOrgMembers(orgId: string) {
  const queryClient = useQueryClient();
  return {
    invalidateMembers: () => queryClient.invalidateQueries({ queryKey: orgMembersQueryKey(orgId) }),
    invalidateMyOrgs: () => queryClient.invalidateQueries({ queryKey: routePrefix(meApi.orgs) }),
  };
}

export function useCounterDevices(orgId: string, enabled = true) {
  return useRouteQuery(
    api,
    counterDevicesApi.list,
    { params: { orgId } },
    { enabled: Boolean(orgId) && enabled },
  );
}

export function useCreateCounterDevice(orgId: string) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, counterDevicesApi.create, {
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: routePrefix(counterDevicesApi.list),
      });
      void queryClient.invalidateQueries({
        queryKey: ['GET', counterDevicesApi.list.path, { params: { orgId } }],
      });
    },
  });
}

export function useRevokeCounterDevice(orgId: string) {
  const queryClient = useQueryClient();
  return useRouteMutation(api, counterDevicesApi.revoke, {
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: routePrefix(counterDevicesApi.list),
      });
      void queryClient.invalidateQueries({
        queryKey: ['GET', counterDevicesApi.list.path, { params: { orgId } }],
      });
    },
  });
}

export function usePairCounterDevice() {
  return useRouteMutation(api, counterDevicesApi.pair);
}

export function useCounterDeviceMe(orgId: string, enabled = true) {
  return useRouteQuery(
    api,
    counterDevicesApi.me,
    { params: { orgId } },
    { enabled: Boolean(orgId) && enabled, retry: false },
  );
}
