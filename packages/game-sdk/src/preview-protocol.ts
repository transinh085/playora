import { z } from 'zod';
import type { PlayOutcome } from './types';

export const PREVIEW_UPDATE_TYPE = 'playora:preview-update' as const;
export const PREVIEW_READY_TYPE = 'playora:preview-ready' as const;

export const PreviewOutcomePreset = z.enum(['win', 'lose', 'out_of_stock']);
export type PreviewOutcomePreset = z.infer<typeof PreviewOutcomePreset>;

export const PreviewPlayOutcome: z.ZodType<PlayOutcome> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('win'),
    prize: z.object({
      id: z.string(),
      name: z.object({
        vi: z.string(),
        en: z.string().optional(),
      }),
      type: z.enum([
        'physical',
        'voucher_code',
        'e_gift',
        'digital',
        'points',
        'consolation',
        'no_prize',
      ]),
      imageUrl: z.string().optional(),
    }),
    voucherCode: z.string().optional(),
  }),
  z.object({ kind: z.literal('lose') }),
  z.object({ kind: z.literal('out_of_stock') }),
]);

export const PreviewOutcome = z.union([PreviewOutcomePreset, PreviewPlayOutcome]);
export type PreviewOutcome = z.infer<typeof PreviewOutcome>;

export const PreviewBrandColors = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  background: z.string().optional(),
  text: z.string().optional(),
});
export type PreviewBrandColors = z.infer<typeof PreviewBrandColors>;

export const PreviewBrand = z.object({
  logoUrl: z.string().optional(),
  colors: PreviewBrandColors.optional(),
  fontHeading: z.string().optional(),
  fontBody: z.string().optional(),
});
export type PreviewBrand = z.infer<typeof PreviewBrand>;

export const PreviewMessage = z
  .object({
    type: z.enum([PREVIEW_UPDATE_TYPE, 'preview:update']).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    skin: z.string().optional(),
    skinKey: z.string().optional(),
    brand: PreviewBrand.optional(),
    locale: z.enum(['vi', 'en']).optional(),
    outcome: PreviewOutcome.optional(),
    assets: z.record(z.string(), z.string()).optional(),
    assetUrls: z.record(z.string(), z.string()).optional(),
  })
  .refine(
    (data) =>
      data.type === PREVIEW_UPDATE_TYPE ||
      data.type === 'preview:update' ||
      data.config !== undefined ||
      data.skin !== undefined ||
      data.skinKey !== undefined ||
      data.brand !== undefined ||
      data.outcome !== undefined ||
      data.assets !== undefined ||
      data.assetUrls !== undefined,
    { message: 'Invalid preview message payload' },
  );

export type PreviewMessage = z.infer<typeof PreviewMessage>;
export type PreviewMessagePayload = PreviewMessage;

export const PreviewReadyMessage = z.object({
  type: z.literal(PREVIEW_READY_TYPE),
});
export type PreviewReadyMessage = z.infer<typeof PreviewReadyMessage>;

export function toPlayOutcome(preset: PreviewOutcomePreset | PlayOutcome): PlayOutcome {
  if (typeof preset === 'object' && preset !== null && 'kind' in preset) {
    return preset;
  }
  if (preset === 'win') {
    return {
      kind: 'win',
      prize: {
        id: 'prize-1',
        name: { vi: 'Giải mẫu', en: 'Sample prize' },
        type: 'voucher_code',
      },
      voucherCode: 'DEMO-2026',
    };
  }
  if (preset === 'out_of_stock') {
    return { kind: 'out_of_stock' };
  }
  return { kind: 'lose' };
}
