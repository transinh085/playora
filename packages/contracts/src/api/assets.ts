import { z } from 'zod';
import { AuthId, Id, IsoDateTime, Ok, OrgParams, Page, PageQuery } from './common';
import { defineRoute } from './route';

export const AssetKind = z.enum(['image', 'audio', 'video']);
export type AssetKind = z.infer<typeof AssetKind>;

export const AssetStatus = z.enum(['pending', 'ready', 'failed']);
export type AssetStatus = z.infer<typeof AssetStatus>;

export const ALLOWED_ASSET_MIMES: Record<AssetKind, readonly string[]> = {
  image: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
  video: ['video/mp4', 'video/webm'],
};

export const MAX_ASSET_BYTES = 50 * 1024 * 1024;

export const AssetCropRect = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});
export type AssetCropRect = z.infer<typeof AssetCropRect>;

export const AssetVariant = z.object({
  key: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  bytes: z.number().int().nonnegative().optional(),
  url: z.string().optional(),
  crop: AssetCropRect.optional(),
});
export type AssetVariant = z.infer<typeof AssetVariant>;

export const AssetVariants = z.record(z.string(), AssetVariant);
export type AssetVariants = z.infer<typeof AssetVariants>;

export const AssetSummary = z.object({
  id: Id,
  organizationId: AuthId,
  kind: AssetKind,
  mime: z.string(),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  variants: AssetVariants,
  status: AssetStatus,
  url: z.string(),
  createdBy: AuthId,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type AssetSummary = z.infer<typeof AssetSummary>;

export const CreateAssetUploadBody = z
  .object({
    kind: AssetKind,
    mime: z.string().trim().min(1).max(120),
    bytes: z.number().int().positive().max(MAX_ASSET_BYTES),
    filename: z.string().trim().min(1).max(255).optional(),
  })
  .refine((d) => ALLOWED_ASSET_MIMES[d.kind].includes(d.mime), {
    message: 'Định dạng tệp không hợp lệ với loại tài nguyên',
    path: ['mime'],
  });
export type CreateAssetUploadBody = z.input<typeof CreateAssetUploadBody>;

export const AssetUploadTicket = z.object({
  assetId: Id,
  uploadUrl: z.string(),
  headers: z.record(z.string(), z.string()),
});
export type AssetUploadTicket = z.infer<typeof AssetUploadTicket>;

export const CompleteAssetUploadBody = z
  .object({
    crop: AssetCropRect.optional(),
  })
  .default({});
export type CompleteAssetUploadBody = z.input<typeof CompleteAssetUploadBody>;

const AssetParams = OrgParams.extend({ assetId: Id });

export const assetsApi = {
  createUpload: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/assets/uploads',
    summary: 'Create a presigned PUT upload ticket for an asset',
    tags: ['assets'],
    auth: 'session',
    permission: { asset: ['create'] },
    params: OrgParams,
    body: CreateAssetUploadBody,
    response: AssetUploadTicket,
    status: 201,
  }),
  completeUpload: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/assets/:assetId/complete',
    summary: 'Mark an uploaded asset as complete and enqueue processing',
    tags: ['assets'],
    auth: 'session',
    permission: { asset: ['create'] },
    params: AssetParams,
    body: CompleteAssetUploadBody,
    response: AssetSummary,
  }),
  list: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/assets',
    summary: 'List assets of an organization',
    tags: ['assets'],
    auth: 'session',
    permission: { asset: ['read'] },
    params: OrgParams,
    query: PageQuery.extend({ kind: AssetKind.optional() }),
    response: Page(AssetSummary),
  }),
  get: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/assets/:assetId',
    summary: 'Get an asset with presigned URLs',
    tags: ['assets'],
    auth: 'session',
    permission: { asset: ['read'] },
    params: AssetParams,
    response: AssetSummary,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/orgs/:orgId/assets/:assetId',
    summary: 'Delete an asset',
    tags: ['assets'],
    auth: 'session',
    permission: { asset: ['delete'] },
    params: AssetParams,
    response: Ok,
  }),
};
