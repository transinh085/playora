import { z } from 'zod';
import { BrandFont, BrandKitColors } from './brand-kits';
import { AuthId, Id, IsoDateTime, OrgParams, Slug } from './common';
import { EventStatus } from './events';
import { defineRoute } from './route';

export const ScreenAspect = z.enum(['16:9', '32:9', '9:16', 'custom']);
export type ScreenAspect = z.infer<typeof ScreenAspect>;

export const ScreenQrPosition = z.enum([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'hidden',
]);
export type ScreenQrPosition = z.infer<typeof ScreenQrPosition>;

export const ScreenQrSize = z.enum(['sm', 'md', 'lg']);
export type ScreenQrSize = z.infer<typeof ScreenQrSize>;

export const ScreenCustomSize = z.object({
  width: z.number().int().min(320).max(16_384),
  height: z.number().int().min(320).max(16_384),
});
export type ScreenCustomSize = z.infer<typeof ScreenCustomSize>;

export const ScreenLayout = z
  .object({
    aspect: ScreenAspect.default('16:9'),
    custom: ScreenCustomSize.optional(),
    safeAreaPct: z.number().min(0).max(20).default(5),
    qrPosition: ScreenQrPosition.default('bottom-right'),
    qrSize: ScreenQrSize.default('md'),
    showEventTitle: z.boolean().default(true),
  })
  .refine(
    (layout) =>
      layout.aspect !== 'custom' ||
      (layout.custom !== undefined && layout.custom.width >= 320 && layout.custom.height >= 320),
    {
      message: 'Cần nhập chiều rộng và chiều cao hợp lệ cho tỷ lệ màn hình tuỳ chỉnh',
      path: ['custom'],
    },
  );
export type ScreenLayout = z.output<typeof ScreenLayout>;
export type ScreenLayoutInput = z.input<typeof ScreenLayout>;

export const DEFAULT_SCREEN_LAYOUT: ScreenLayout = {
  aspect: '16:9',
  safeAreaPct: 5,
  qrPosition: 'bottom-right',
  qrSize: 'md',
  showEventTitle: true,
};

export interface AspectFitResult {
  /** Logical canvas width in pixels (1920, 3840, 1080, or custom width). */
  stageWidth: number;
  /** Logical canvas height in pixels (1080, 1920, or custom height). */
  stageHeight: number;
  /** Target aspect ratio (stageWidth / stageHeight). */
  ratio: number;
  /** Fitted stage width in viewport CSS pixels. */
  width: number;
  /** Fitted stage height in viewport CSS pixels. */
  height: number;
  /** Uniform scale factor applied to fit the logical canvas into the viewport. */
  scale: number;
  /** Horizontal letterbox/pillarbox offset in CSS pixels. */
  offsetX: number;
  /** Vertical letterbox offset in CSS pixels. */
  offsetY: number;
}

export function resolveScreenDimensions(layout: Pick<ScreenLayout, 'aspect' | 'custom'>): {
  width: number;
  height: number;
  ratio: number;
} {
  switch (layout.aspect) {
    case '32:9':
      return { width: 3840, height: 1080, ratio: 32 / 9 };
    case '9:16':
      return { width: 1080, height: 1920, ratio: 9 / 16 };
    case 'custom': {
      const width = layout.custom?.width ?? 1920;
      const height = layout.custom?.height ?? 1080;
      return { width, height, ratio: width / height };
    }
    default:
      return { width: 1920, height: 1080, ratio: 16 / 9 };
  }
}

/**
 * Computes the letterboxed and scaled stage rectangle that fits `layout` inside `viewport`.
 */
export function computeAspectFit(
  viewport: { width: number; height: number },
  layout: Pick<ScreenLayout, 'aspect' | 'custom'>,
): AspectFitResult {
  const { width: stageWidth, height: stageHeight, ratio } = resolveScreenDimensions(layout);
  if (viewport.width <= 0 || viewport.height <= 0) {
    return {
      stageWidth,
      stageHeight,
      ratio,
      width: 0,
      height: 0,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }
  const scale = Math.min(viewport.width / stageWidth, viewport.height / stageHeight);
  const width = stageWidth * scale;
  const height = stageHeight * scale;
  const offsetX = (viewport.width - width) / 2;
  const offsetY = (viewport.height - height) / 2;
  return {
    stageWidth,
    stageHeight,
    ratio,
    width,
    height,
    scale,
    offsetX,
    offsetY,
  };
}

/**
 * Builds the screen launch URL `${PLAY_URL}/screen#k=<key>` (key in fragment so it never reaches server logs).
 */
export function buildScreenLaunchUrl(playBaseUrl: string, rawKey: string): string {
  const base = playBaseUrl.replace(/\/$/, '');
  return `${base}/screen#k=${encodeURIComponent(rawKey)}`;
}

/**
 * Extracts `k` from a URL fragment (`#k=<key>`), falling back to a previously stored key.
 */
export function parseScreenKeyFragment(
  hash: string,
  storedKey: string | null = null,
): { key: string | null; fromFragment: boolean } {
  const cleaned = hash.replace(/^#/, '').trim();
  if (cleaned) {
    const params = new URLSearchParams(cleaned);
    const fromHash = params.get('k')?.trim();
    if (fromHash) {
      return { key: fromHash, fromFragment: true };
    }
  }
  const fallback = storedKey?.trim() || null;
  return { key: fallback, fromFragment: false };
}

export const ScreenSummary = z.object({
  id: Id,
  organizationId: AuthId,
  eventId: Id,
  name: z.string(),
  layout: ScreenLayout,
  revokedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type ScreenSummary = z.infer<typeof ScreenSummary>;

export const ScreenIssued = ScreenSummary.extend({
  key: z.string().min(43),
  launchUrl: z.string(),
});
export type ScreenIssued = z.infer<typeof ScreenIssued>;

export const ListScreensResponse = z.object({
  items: z.array(ScreenSummary),
});
export type ListScreensResponse = z.infer<typeof ListScreensResponse>;

export const CreateScreenBody = z.object({
  name: z.string().trim().min(1).max(120),
  layout: ScreenLayout.default(DEFAULT_SCREEN_LAYOUT),
});
export type CreateScreenBody = z.input<typeof CreateScreenBody>;

export const UpdateScreenBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    layout: ScreenLayout,
  })
  .partial();
export type UpdateScreenBody = z.input<typeof UpdateScreenBody>;

export const ScreenBrandKit = z.object({
  id: Id,
  name: z.string(),
  colors: BrandKitColors,
  fontHeading: BrandFont.optional(),
  fontBody: BrandFont.optional(),
  logoUrl: z.string().nullable(),
  backgroundUrl: z.string().nullable(),
});
export type ScreenBrandKit = z.infer<typeof ScreenBrandKit>;

export const ScreenSession = z.object({
  screen: z.object({
    id: Id,
    name: z.string(),
  }),
  event: z.object({
    id: Id,
    name: z.string(),
    slug: Slug,
    status: EventStatus,
  }),
  brandKit: ScreenBrandKit.nullable(),
  layout: ScreenLayout,
  joinUrl: z.string(),
});
export type ScreenSession = z.infer<typeof ScreenSession>;

const EventParams = OrgParams.extend({ eventId: Id });
const ScreenParams = EventParams.extend({ screenId: Id });

export const screensApi = {
  list: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/events/:eventId/screens',
    summary: 'List screens of an event (without raw keys)',
    tags: ['screens'],
    auth: 'session',
    permission: { event: ['read'] },
    params: EventParams,
    response: ListScreensResponse,
  }),
  create: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/events/:eventId/screens',
    summary: 'Create a screen and return its raw key once',
    tags: ['screens'],
    auth: 'session',
    permission: { event: ['update'] },
    params: EventParams,
    body: CreateScreenBody,
    response: ScreenIssued,
    status: 201,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/orgs/:orgId/events/:eventId/screens/:screenId',
    summary: 'Rename a screen or update its layout preset',
    tags: ['screens'],
    auth: 'session',
    permission: { event: ['update'] },
    params: ScreenParams,
    body: UpdateScreenBody,
    response: ScreenSummary,
  }),
  revoke: defineRoute({
    method: 'DELETE',
    path: '/orgs/:orgId/events/:eventId/screens/:screenId',
    summary: 'Revoke a screen key',
    tags: ['screens'],
    auth: 'session',
    permission: { event: ['update'] },
    params: ScreenParams,
    response: ScreenSummary,
  }),
  rotate: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/events/:eventId/screens/:screenId/rotate',
    summary: 'Rotate a screen key and return the new raw key once',
    tags: ['screens'],
    auth: 'session',
    permission: { event: ['update'] },
    params: ScreenParams,
    response: ScreenIssued,
  }),
  session: defineRoute({
    method: 'GET',
    path: '/screen/session',
    summary: 'Resolve screen session from x-screen-key header',
    tags: ['screens'],
    auth: 'public',
    response: ScreenSession,
  }),
};
