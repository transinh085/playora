'use client';

import { type ApiError, routeKey } from '@playora/api-client';
import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import {
  type CampaignBrand,
  type CampaignCompliance,
  type CampaignListItem,
  type CampaignPhase,
  type CampaignPlayRecord,
  type CampaignPrize,
  type CampaignPrizeMode,
  type CampaignReport,
  type CampaignRules,
  type CampaignSkinKey,
  type CampaignStats,
  type CampaignStatus,
  type CampaignTemplateKey,
  type CampaignVoucher,
  type Campaign as ContractCampaign,
  campaignsApi,
  type PlaybookKey,
  type PlayResult,
  type RouteArgs,
  type VoucherLookup,
  type VoucherStatus,
  vouchersApi,
} from '@playora/contracts';
import { type CanvasDoc, toCanvasDoc } from '@playora/ui/campaign';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  buildScreens,
  defaultPrizes,
  defaultRules,
  type Industry,
  type MechanismKey,
  type Occasion,
  type SkinInfo,
  type SkinKey,
  skinBrand,
  type TemplateInfo,
  type TemplateKey,
} from './lib/starter';

export type CampaignPrizeRuleMode = CampaignPrizeMode;
export type CampaignRuleOpeningHours = NonNullable<CampaignRules['openingHours']>;

export type {
  CampaignBrand,
  CampaignCompliance,
  CampaignListItem,
  CampaignPhase,
  CampaignPlayRecord,
  CampaignPrize,
  CampaignPrizeMode,
  CampaignReport,
  CampaignRules,
  CampaignSkinKey,
  CampaignStats,
  CampaignStatus,
  CampaignTemplateKey,
  CampaignVoucher,
  Industry,
  MechanismKey,
  Occasion,
  PlaybookKey,
  PlayResult,
  SkinInfo,
  SkinKey,
  TemplateInfo,
  TemplateKey,
  VoucherLookup,
  VoucherStatus,
};

/** Campaign with `screens` typed as the Studio canvas document (`CanvasDoc`). */
export type Campaign = Omit<ContractCampaign, 'screens'> & { screens: CanvasDoc };

export function toStudioCampaign(campaign: ContractCampaign): Campaign {
  return { ...campaign, screens: toCanvasDoc(campaign.screens) };
}

// ── Campaign Queries ─────────────────────────────────────────────────────────

export function useCampaigns(orgId: string) {
  const query = useRouteQuery(
    api,
    campaignsApi.list,
    { params: { orgId }, query: { limit: 100 } },
    { enabled: Boolean(orgId) },
  );
  return { ...query, data: query.data?.items };
}

export function useCampaign(orgId: string, campaignId: string) {
  const query = useRouteQuery(
    api,
    campaignsApi.get,
    { params: { orgId, campaignId } },
    { enabled: Boolean(orgId && campaignId) },
  );
  return {
    ...query,
    data: query.data ? toStudioCampaign(query.data) : undefined,
  };
}

export function useCampaignStats(
  orgId: string,
  campaignId: string,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useRouteQuery(
    api,
    campaignsApi.stats,
    { params: { orgId, campaignId } },
    {
      enabled: Boolean(orgId && campaignId) && (options?.enabled ?? true),
      refetchInterval: options?.refetchInterval,
    },
  );
}

export function useCampaignReport(
  orgId: string,
  campaignId: string,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useRouteQuery(
    api,
    campaignsApi.report,
    { params: { orgId, campaignId } },
    {
      enabled: Boolean(orgId && campaignId) && (options?.enabled ?? true),
      refetchInterval: options?.refetchInterval,
    },
  );
}

/** Stats for a list of campaigns, keyed by campaign id. */
export function useCampaignsStats(orgId: string, campaignIds: readonly string[]) {
  const results = useQueries({
    queries: campaignIds.map((campaignId) => ({
      queryKey: routeKey(campaignsApi.stats, { params: { orgId, campaignId } }),
      queryFn: () => api.call(campaignsApi.stats, { params: { orgId, campaignId } }),
      enabled: Boolean(orgId && campaignId),
    })),
  });
  const byId = new Map<string, CampaignStats>();
  campaignIds.forEach((id, i) => {
    const data = results[i]?.data;
    if (data) byId.set(id, data);
  });
  return { data: byId, isPending: results.some((r) => r.isPending) };
}

export function useCampaignPlays(
  orgId: string,
  campaignId: string,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  const query = useRouteQuery(
    api,
    campaignsApi.plays,
    { params: { orgId, campaignId }, query: { limit: 100 } },
    {
      enabled: Boolean(orgId && campaignId) && (options?.enabled ?? true),
      refetchInterval: options?.refetchInterval,
    },
  );
  return { ...query, data: query.data?.items };
}

export function useCampaignVouchers(orgId: string, campaignId: string) {
  const query = useRouteQuery(
    api,
    campaignsApi.vouchers,
    { params: { orgId, campaignId }, query: { limit: 100 } },
    { enabled: Boolean(orgId && campaignId) },
  );
  return { ...query, data: query.data?.items };
}

export function useCampaignsReports(orgId: string, campaignIds: readonly string[]) {
  const results = useQueries({
    queries: campaignIds.map((campaignId) => ({
      queryKey: routeKey(campaignsApi.report, { params: { orgId, campaignId } }),
      queryFn: () => api.call(campaignsApi.report, { params: { orgId, campaignId } }),
      enabled: Boolean(orgId && campaignId),
    })),
  });
  const byId = new Map<string, CampaignReport>();
  campaignIds.forEach((id, i) => {
    const data = results[i]?.data;
    if (data) byId.set(id, data);
  });
  return { data: byId, isPending: results.some((r) => r.isPending) };
}

export function useCampaignsVouchers(orgId: string, campaignIds: readonly string[]) {
  const results = useQueries({
    queries: campaignIds.map((campaignId) => ({
      queryKey: routeKey(campaignsApi.vouchers, {
        params: { orgId, campaignId },
        query: { limit: 20 },
      }),
      queryFn: () =>
        api.call(campaignsApi.vouchers, {
          params: { orgId, campaignId },
          query: { limit: 20 },
        }),
      enabled: Boolean(orgId && campaignId),
    })),
  });
  const allVouchers = results.flatMap((r) => r.data?.items ?? []);
  return { vouchers: allVouchers, isPending: results.some((r) => r.isPending) };
}

// ── Campaign Mutations ───────────────────────────────────────────────────────

export interface CreateCampaignStarterInput {
  name: string;
  templateKey: CampaignTemplateKey;
  skinKey: CampaignSkinKey;
  brand?: Partial<CampaignBrand>;
  /** Goal-led start (docs/product/specs/playbooks.md): prizes and rules come from the suggestion. */
  playbook?: PlaybookKey | null;
  prizes?: CampaignPrize[];
  rules?: CampaignRules;
}

export function useCreateCampaign(orgId: string) {
  const qc = useQueryClient();
  return useMutation<Campaign, ApiError, CreateCampaignStarterInput>({
    mutationFn: async (input) => {
      const created = await api.call(campaignsApi.create, {
        params: { orgId },
        body: {
          name: input.name,
          templateKey: input.templateKey,
          skinKey: input.skinKey,
          brand: { ...skinBrand(input.skinKey), ...input.brand },
          screens: buildScreens(
            input.templateKey,
            input.skinKey,
          ) as unknown as ContractCampaign['screens'],
          playbook: input.playbook ?? null,
          prizes: input.prizes ?? defaultPrizes(),
          rules: input.rules ?? defaultRules(),
        },
      });
      return toStudioCampaign(created);
    },
    onSuccess: (created) => {
      qc.setQueryData(routeKey(campaignsApi.get, { params: { orgId, campaignId: created.id } }), {
        ...created,
      });
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.list) });
    },
  });
}

export type CampaignDraftPatch = Partial<
  Pick<Campaign, 'name' | 'skinKey' | 'brand' | 'screens' | 'prizes' | 'rules'>
>;

export function useUpdateCampaign(orgId: string, campaignId: string) {
  const qc = useQueryClient();
  const detailKey = routeKey(campaignsApi.get, { params: { orgId, campaignId } });

  return useMutation<Campaign, ApiError, CampaignDraftPatch, { previous?: ContractCampaign }>({
    mutationFn: async (patch) => {
      const { screens, ...rest } = patch;
      const updated = await api.call(campaignsApi.update, {
        params: { orgId, campaignId },
        body: {
          ...rest,
          ...(screens ? { screens: screens as unknown as ContractCampaign['screens'] } : {}),
        },
      });
      return toStudioCampaign(updated);
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: detailKey });
      const previous = qc.getQueryData<ContractCampaign>(detailKey);
      if (previous) {
        const { screens, ...rest } = patch;
        qc.setQueryData<ContractCampaign>(detailKey, {
          ...previous,
          ...rest,
          ...(screens ? { screens: screens as unknown as ContractCampaign['screens'] } : {}),
          updatedAt: new Date().toISOString(),
        });
      }
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(detailKey, ctx.previous);
    },
    onSuccess: (updated) => {
      qc.setQueryData(detailKey, updated);
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.list) });
      void qc.invalidateQueries({
        queryKey: routeKey(campaignsApi.stats, { params: { orgId, campaignId } }),
      });
      void qc.invalidateQueries({
        queryKey: routeKey(campaignsApi.report, { params: { orgId, campaignId } }),
      });
    },
  });
}

export function usePublishCampaign(orgId: string, campaignId: string) {
  const qc = useQueryClient();
  const detailKey = routeKey(campaignsApi.get, { params: { orgId, campaignId } });

  return useMutation<Campaign, ApiError, void>({
    mutationFn: async () => {
      const published = await api.call(campaignsApi.publish, {
        params: { orgId, campaignId },
      });
      return toStudioCampaign(published);
    },
    onSuccess: (published) => {
      qc.setQueryData(detailKey, published);
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.list) });
      void qc.invalidateQueries({
        queryKey: routeKey(campaignsApi.stats, { params: { orgId, campaignId } }),
      });
      void qc.invalidateQueries({
        queryKey: routeKey(campaignsApi.report, { params: { orgId, campaignId } }),
      });
    },
  });
}

export function useDeleteCampaign(orgId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (campaignId) => {
      await api.call(campaignsApi.remove, { params: { orgId, campaignId } });
    },
    onSuccess: (_data, campaignId) => {
      qc.removeQueries({
        queryKey: routeKey(campaignsApi.get, { params: { orgId, campaignId } }),
      });
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.list) });
    },
  });
}

export function usePauseCampaign(orgId: string) {
  const qc = useQueryClient();
  return useMutation<Campaign, ApiError, string>({
    mutationFn: async (campaignId) => {
      const updated = await api.call(campaignsApi.pause, { params: { orgId, campaignId } });
      return toStudioCampaign(updated);
    },
    onSuccess: (updated) => {
      qc.setQueryData(
        routeKey(campaignsApi.get, { params: { orgId, campaignId: updated.id } }),
        updated,
      );
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.list) });
    },
  });
}

export function useResumeCampaign(orgId: string) {
  const qc = useQueryClient();
  return useMutation<Campaign, ApiError, string>({
    mutationFn: async (campaignId) => {
      const updated = await api.call(campaignsApi.resume, { params: { orgId, campaignId } });
      return toStudioCampaign(updated);
    },
    onSuccess: (updated) => {
      qc.setQueryData(
        routeKey(campaignsApi.get, { params: { orgId, campaignId: updated.id } }),
        updated,
      );
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.list) });
    },
  });
}

export function useEndCampaign(orgId: string) {
  const qc = useQueryClient();
  return useMutation<Campaign, ApiError, string>({
    mutationFn: async (campaignId) => {
      const updated = await api.call(campaignsApi.end, { params: { orgId, campaignId } });
      return toStudioCampaign(updated);
    },
    onSuccess: (updated) => {
      qc.setQueryData(
        routeKey(campaignsApi.get, { params: { orgId, campaignId: updated.id } }),
        updated,
      );
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.list) });
    },
  });
}

export function useRehearsalPlay(orgId: string, campaignId: string) {
  return useMutation<PlayResult, ApiError, RouteArgs<typeof campaignsApi.rehearsalPlay>['body']>({
    mutationFn: (body) =>
      api.call(campaignsApi.rehearsalPlay, {
        params: { orgId, campaignId },
        body,
      }),
  });
}

// ── Voucher Queries & Mutations ──────────────────────────────────────────────

export function useVoucherLookup(orgId: string, code: string) {
  const cleanCode = code.trim().toUpperCase();
  return useRouteQuery(
    api,
    vouchersApi.lookup,
    { params: { orgId, code: cleanCode } },
    {
      enabled: Boolean(orgId) && cleanCode.length >= 4,
      retry: false,
    },
  );
}

export function useRedeemVoucher(orgId: string) {
  const qc = useQueryClient();
  return useMutation<VoucherLookup, ApiError, string>({
    mutationFn: (code) =>
      api.call(vouchersApi.redeem, {
        params: { orgId, code: code.trim().toUpperCase() },
      }),
    onSuccess: (updated) => {
      qc.setQueryData(
        routeKey(vouchersApi.lookup, { params: { orgId, code: updated.code } }),
        updated,
      );
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.stats) });
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.report) });
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.vouchers) });
    },
  });
}

export function useReopenVoucher(orgId: string) {
  const qc = useQueryClient();
  return useRouteMutation(api, vouchersApi.reopen, {
    onSuccess: (updated) => {
      qc.setQueryData(
        routeKey(vouchersApi.lookup, { params: { orgId, code: updated.code } }),
        updated,
      );
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.stats) });
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.report) });
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.vouchers) });
    },
  });
}
