'use client';

import { routePrefix } from '@playora/api-client/react';
import { meApi } from '@playora/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';

export const invitationQueryKey = (id: string, userId?: string) =>
  ['auth', 'invitation', id, userId] as const;

export function useInvitation(id: string, userId?: string) {
  return useQuery({
    queryKey: invitationQueryKey(id, userId),
    enabled: Boolean(userId && id),
    retry: false,
    queryFn: async () => {
      const { data, error } = await authClient.organization.getInvitation({ query: { id } });
      if (error || !data) {
        throw new Error(error?.message ?? 'Invitation not found');
      }
      return data;
    },
  });
}

export function useInvalidateMyOrgs() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: routePrefix(meApi.orgs) });
}
