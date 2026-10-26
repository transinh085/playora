'use client';

import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import { adminApi, billingApi, meApi } from '@playora/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { can } from '@/lib/permissions';

/** Plan, limits, usage and invoices of an organization (BIL-01/02). */
export function useOrgBilling(orgId: string, options?: { enabled?: boolean }) {
  return useRouteQuery(
    api,
    billingApi.get,
    { params: { orgId } },
    { enabled: Boolean(orgId) && (options?.enabled ?? true) },
  );
}

/**
 * Billing for members allowed to read it; counter-only staff ("chỉ đổi quà") have no `billing:read`
 * and get `undefined` without a request.
 */
export function useOrgBillingIfAllowed(orgId: string) {
  const myOrgs = useRouteQuery(api, meApi.orgs, {});
  const role = myOrgs.data?.items.find((o) => o.id === orgId)?.role;
  const allowed = can(role, { billing: ['read'] });
  return { allowed, ...useOrgBilling(orgId, { enabled: allowed }) };
}

/** Refreshes usage everywhere it is shown, e.g. after a redemption or a publish. */
export function useInvalidateBilling() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: routePrefix(billingApi.get) });
}

// ── Back-office (ADM-01) ─────────────────────────────────────────────────────

export function useAdminOrgs(query: string) {
  return useRouteQuery(
    api,
    adminApi.orgs,
    { query: { query: query || undefined, limit: 50 } },
    { placeholderData: (previous) => previous },
  );
}

function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: routePrefix(adminApi.orgs) }),
      qc.invalidateQueries({ queryKey: routePrefix(billingApi.get) }),
    ]);
}

export function useSetSubscription() {
  const invalidate = useInvalidateAdmin();
  return useRouteMutation(api, adminApi.setSubscription, { onSuccess: () => invalidate() });
}

export function useRecordInvoice() {
  const invalidate = useInvalidateAdmin();
  return useRouteMutation(api, adminApi.recordInvoice, { onSuccess: () => invalidate() });
}
