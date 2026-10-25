'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  campaigns: ['builder-lab', 'campaigns'] as const,
  campaign: (id: string) => ['builder-lab', 'campaign', id] as const,
  stats: (id: string) => ['builder-lab', 'stats', id] as const,
  vouchers: (campaignId: string, playerId: string) =>
    ['builder-lab', 'vouchers', campaignId, playerId] as const,
};

/** Refetch everything when another tab (player, staff) writes to the lab db. */
export function useLabSync() {
  const client = useQueryClient();
  useEffect(() => subscribeDb(() => client.invalidateQueries({ queryKey: keys.all })), [client]);
}

export const useCampaigns = () =>
  useQuery({ queryKey: keys.campaigns, queryFn: api.listCampaigns });

export const useCampaign = (id: string) =>
  useQuery({ queryKey: keys.campaign(id), queryFn: () => api.getCampaign(id), retry: false });

export const useCampaignStats = (id: string) =>
  useQuery({ queryKey: keys.stats(id), queryFn: () => api.getCampaignStats(id) });

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
    onSuccess: (campaign) => client.setQueryData(keys.campaign(id), campaign),
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
