import { z } from 'zod';
import { AuthId, Id, IsoDateTime, Ok, OrgParams, Page, PageQuery } from './common';
import { defineRoute } from './route';

export const HexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Màu phải ở định dạng mã hex (ví dụ #7c3aed)');

export const BRAND_FONTS = [
  'Be Vietnam Pro',
  'Unbounded',
  'Plus Jakarta Sans',
  'Inter',
  'Montserrat',
  'Playfair Display',
] as const;

export const BrandFont = z.enum(BRAND_FONTS);
export type BrandFont = z.infer<typeof BrandFont>;

export const BrandKitColors = z.object({
  primary: HexColor,
  secondary: HexColor.optional(),
  background: HexColor,
  text: HexColor,
});
export type BrandKitColors = z.infer<typeof BrandKitColors>;

export const BrandKitTokens = z.object({
  colors: BrandKitColors,
  fontHeading: BrandFont.optional(),
  fontBody: BrandFont.optional(),
  logoAssetId: Id.nullable().optional(),
  backgroundAssetId: Id.nullable().optional(),
  musicAssetId: Id.nullable().optional(),
});
export type BrandKitTokens = z.infer<typeof BrandKitTokens>;

export const BrandKitSummary = z.object({
  id: Id,
  organizationId: AuthId,
  clientId: Id.nullable(),
  name: z.string(),
  tokens: BrandKitTokens,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type BrandKitSummary = z.infer<typeof BrandKitSummary>;

export const CreateBrandKitBody = z.object({
  name: z.string().trim().min(1).max(120),
  clientId: Id.nullable().optional(),
  tokens: BrandKitTokens,
});
export type CreateBrandKitBody = z.input<typeof CreateBrandKitBody>;

export const UpdateBrandKitBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    clientId: Id.nullable(),
    tokens: BrandKitTokens,
  })
  .partial();
export type UpdateBrandKitBody = z.input<typeof UpdateBrandKitBody>;

const BrandKitParams = OrgParams.extend({ brandKitId: Id });

export const brandKitsApi = {
  list: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/brand-kits',
    summary: 'List brand kits of an organization',
    tags: ['brand-kits'],
    auth: 'session',
    permission: { brandKit: ['read'] },
    params: OrgParams,
    query: PageQuery,
    response: Page(BrandKitSummary),
  }),
  create: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/brand-kits',
    summary: 'Create a brand kit',
    tags: ['brand-kits'],
    auth: 'session',
    permission: { brandKit: ['create'] },
    params: OrgParams,
    body: CreateBrandKitBody,
    response: BrandKitSummary,
    status: 201,
  }),
  get: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/brand-kits/:brandKitId',
    summary: 'Get a brand kit',
    tags: ['brand-kits'],
    auth: 'session',
    permission: { brandKit: ['read'] },
    params: BrandKitParams,
    response: BrandKitSummary,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/orgs/:orgId/brand-kits/:brandKitId',
    summary: 'Update a brand kit',
    tags: ['brand-kits'],
    auth: 'session',
    permission: { brandKit: ['update'] },
    params: BrandKitParams,
    body: UpdateBrandKitBody,
    response: BrandKitSummary,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/orgs/:orgId/brand-kits/:brandKitId',
    summary: 'Delete a brand kit',
    tags: ['brand-kits'],
    auth: 'session',
    permission: { brandKit: ['delete'] },
    params: BrandKitParams,
    response: Ok,
  }),
};
