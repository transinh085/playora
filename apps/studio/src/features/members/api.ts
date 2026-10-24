'use client';

import { routePrefix } from '@playora/api-client/react';
import { meApi } from '@playora/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';

export const orgMembersQueryKey = (orgId: string) => ['auth', 'org-full', orgId] as const;

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: orgMembersQueryKey(orgId),
    queryFn: async () => {
      const { data, error } = await authClient.organization.getFullOrganization({
        query: { organizationId: orgId },
      });
      if (error || !data) throw new Error(error?.message ?? 'Failed to load organization');
      return data;
    },
  });
}

export function useInvalidateOrgMembers(orgId: string) {
  const queryClient = useQueryClient();
  return {
    invalidateMembers: () => queryClient.invalidateQueries({ queryKey: orgMembersQueryKey(orgId) }),
    invalidateMyOrgs: () => queryClient.invalidateQueries({ queryKey: routePrefix(meApi.orgs) }),
  };
}
