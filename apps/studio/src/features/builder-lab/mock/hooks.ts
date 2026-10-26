'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as api from './api';
import { subscribeDb } from './db';
import type { Campaign } from './types';

/**
 * TanStack Query wrappers over the mock API, mirroring how features use `useRouteQuery` today.
 * When the real endpoints land, only these hooks change.
 */
const keys = {
  all: ['builder-lab'] as const,
  campaigns: (orgId: string) => ['builder-lab', 'campaigns', orgId] as const,
  campaign: (id: string) => ['builder-lab', 'campaign', id] as const,
  stats: (id: string) => ['builder-lab', 'stats', id] as const,
  plays: (id: string) => ['builder-lab', 'plays', id] as const,
  issued: (id: string) => ['builder-lab', 'issued', id] as const,
  vouchers: (campaignId: string, playerId: string) =>
    ['builder-lab', 'vouchers', campaignId, playerId] as const,
};

/** Refetch everything when another tab (player, staff) writes to the lab db. */
export function useLabSync() {
  const client = useQueryClient();
  useEffect(() => subscribeDb(() => client.invalidateQueries({ queryKey: keys.all })), [client]);
}

export const useCampaigns = (orgId: string) =>
  useQuery({ queryKey: keys.campaigns(orgId), queryFn: () => api.listCampaigns(orgId) });

export const useCampaign = (id: string) =>
  useQuery({ queryKey: keys.campaign(id), queryFn: () => api.getCampaign(id), retry: false });

export const useCampaignStats = (id: string) =>
  useQuery({ queryKey: keys.stats(id), queryFn: () => api.getCampaignStats(id) });

/** Stats for many campaigns at once (Home attention list). */
export const useCampaignsStats = (ids: readonly string[]) =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: keys.stats(id),
      queryFn: () => api.getCampaignStats(id),
    })),
  });

export const useCampaignPlays = (id: string) =>
  useQuery({ queryKey: keys.plays(id), queryFn: () => api.listCampaignPlays(id) });

export const useCampaignVouchers = (id: string) =>
  useQuery({ queryKey: keys.issued(id), queryFn: () => api.listCampaignVouchers(id) });

export const useMyVouchers = (campaignId: string, playerId: string) =>
  useQuery({
    queryKey: keys.vouchers(campaignId, playerId),
    queryFn: () => api.listMyVouchers({ campaignId, playerId }),
  });

function useInvalidateAll() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: keys.all });
}

export function useCreateCampaign() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: api.createCampaign, onSuccess: invalidate });
}

/** Draft saves update the cache immediately so editing feels instant. */
export function useUpdateCampaign(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateCampaign>[1]) => api.updateCampaign(id, patch),
    onMutate: (patch) => {
      client.setQueryData<Campaign>(keys.campaign(id), (current) =>
        current ? { ...current, ...patch } : current,
      );
    },
    onSuccess: (campaign) => {
      client.setQueryData(keys.campaign(id), campaign);
      // Lists show the name and status; mark them stale without refetching the editor's own query.
      void client.invalidateQueries({ queryKey: ['builder-lab', 'campaigns'] });
    },
  });
}

export function usePublishCampaign(id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => api.publishCampaign(id), onSuccess: invalidate });
}

export function useDeleteCampaign() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: api.deleteCampaign, onSuccess: invalidate });
}

export function useStartPlay() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: api.startPlay, onSuccess: invalidate });
}

export function useRedeemVoucher() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: api.redeemVoucher, onSuccess: invalidate });
}

export function usePauseCampaign() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: api.pauseCampaign, onSuccess: invalidate });
}

export function useResumeCampaign() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: api.resumeCampaign, onSuccess: invalidate });
}

export function useEndCampaign() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: api.endCampaign, onSuccess: invalidate });
}
