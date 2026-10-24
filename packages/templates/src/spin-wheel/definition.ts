import {
  defineTemplate,
  field,
  type InstantServerModule,
  type PlayOutcome,
} from '@playora/game-sdk/server';
import { z } from 'zod';

// TODO(PRZ-01): prizeSlot is a free key that the prize setup UI will map to a prize.
export const spinWheelSegmentSchema = z.object({
  label: field.localized({
    label: { vi: 'Nhãn ô', en: 'Segment label' },
    default: { vi: 'Quà may mắn', en: 'Lucky gift' },
  }),
  color: field.color({
    label: { vi: 'Màu ô', en: 'Segment color' },
    default: '#7C3AED',
  }),
  prizeSlot: field.text({
    label: { vi: 'Mã ô giải thưởng', en: 'Prize slot key' },
    default: 'none',
  }),
});

export type SpinWheelSegment = z.infer<typeof spinWheelSegmentSchema>;

export const DEFAULT_SPIN_WHEEL_SEGMENTS: SpinWheelSegment[] = [
  {
    label: { vi: 'Giải Nhất', en: 'First Prize' },
    color: '#7C3AED',
    prizeSlot: 'prize-1',
  },
  {
    label: { vi: 'Chúc may mắn', en: 'Good luck next time' },
    color: '#1E1B4B',
    prizeSlot: 'none',
  },
  {
    label: { vi: 'Giải Nhì', en: 'Second Prize' },
    color: '#F59E0B',
    prizeSlot: 'prize-2',
  },
  {
    label: { vi: 'Thêm lượt vui', en: 'Keep trying' },
    color: '#312E81',
    prizeSlot: 'none',
  },
  {
    label: { vi: 'Voucher 50K', en: '50K Voucher' },
    color: '#10B981',
    prizeSlot: 'prize-3',
  },
  {
    label: { vi: 'Cảm ơn bạn', en: 'Thank you' },
    color: '#1E1B4B',
    prizeSlot: 'none',
  },
];

export const spinWheelConfigSchema = z.object({
  segments: field
    .list(spinWheelSegmentSchema, {
      min: 4,
      max: 12,
      group: 'gameplay',
      label: { vi: 'Các ô trên vòng quay', en: 'Wheel segments' },
      itemLabel: { vi: 'Ô vòng quay', en: 'Segment' },
    })
    .default(DEFAULT_SPIN_WHEEL_SEGMENTS),
  spins: field.slider({
    min: 3,
    max: 10,
    step: 1,
    int: true,
    default: 5,
    group: 'gameplay',
    label: { vi: 'Số vòng quay', en: 'Number of spins' },
  }),
  durationMs: field.slider({
    min: 3000,
    max: 8000,
    step: 500,
    int: true,
    default: 3000,
    group: 'gameplay',
    label: { vi: 'Thời gian quay (ms)', en: 'Spin duration (ms)' },
  }),
  backgroundImage: field
    .asset('background', {
      group: 'appearance',
      label: { vi: 'Ảnh nền', en: 'Background image' },
    })
    .optional(),
  centerLogo: field
    .asset('centerLogo', {
      group: 'appearance',
      label: { vi: 'Logo tâm vòng quay', en: 'Center logo' },
    })
    .optional(),
  copy: z
    .object({
      title: field.localized({
        label: { vi: 'Tiêu đề', en: 'Title' },
        default: { vi: 'Vòng quay may mắn', en: 'Lucky Spin Wheel' },
        group: 'content',
        hotEditable: true,
      }),
      cta: field.localized({
        label: { vi: 'Nút quay', en: 'Spin button' },
        default: { vi: 'Quay ngay', en: 'Spin now' },
        group: 'content',
        hotEditable: true,
      }),
    })
    .prefault({}),
});

export type SpinWheelConfig = z.infer<typeof spinWheelConfigSchema>;

export interface SpinWheelDisplay {
  segmentIndex: number;
}

function pickRandomIndex(indices: number[], rng: () => number): number {
  if (indices.length === 0) return 0;
  const raw = Math.floor(rng() * indices.length);
  const clamped = Math.max(0, Math.min(indices.length - 1, raw));
  return indices[clamped] ?? 0;
}

export const spinWheelServer: InstantServerModule<SpinWheelConfig, SpinWheelDisplay> = {
  present(outcome: PlayOutcome, config: SpinWheelConfig, rng: () => number): SpinWheelDisplay {
    const segments = config.segments ?? [];
    if (segments.length === 0) {
      return { segmentIndex: 0 };
    }

    // TODO(PRZ-01): mapping prize -> segment comes from the prize setup story.
    if (outcome.kind === 'win') {
      const exactMatches: number[] = [];
      const anyPrizeMatches: number[] = [];
      segments.forEach((seg, idx) => {
        if (seg.prizeSlot === outcome.prize.id) {
          exactMatches.push(idx);
        }
        if (seg.prizeSlot && seg.prizeSlot !== 'none') {
          anyPrizeMatches.push(idx);
        }
      });

      if (exactMatches.length > 0) {
        return { segmentIndex: pickRandomIndex(exactMatches, rng) };
      }
      if (anyPrizeMatches.length > 0) {
        return { segmentIndex: pickRandomIndex(anyPrizeMatches, rng) };
      }
      return { segmentIndex: 0 };
    }

    const loseMatches: number[] = [];
    segments.forEach((seg, idx) => {
      if (!seg.prizeSlot || seg.prizeSlot === 'none') {
        loseMatches.push(idx);
      }
    });

    if (loseMatches.length > 0) {
      return { segmentIndex: pickRandomIndex(loseMatches, rng) };
    }
    return { segmentIndex: 0 };
  },
};

export const spinWheelTemplate = defineTemplate({
  id: 'spin-wheel',
  version: '1.0.0',
  kind: 'instant',
  name: { vi: 'Vòng quay may mắn', en: 'Lucky Spin Wheel' },
  description: {
    vi: 'Quay vòng quay may mắn nhận quà tức thì.',
    en: 'Spin the lucky wheel to win instant prizes.',
  },
  thumbnail: '/templates/spin-wheel/thumb.png',
  tags: ['instant', 'tet', 'chung'],
  configSchema: spinWheelConfigSchema,
  assetSlots: [
    {
      key: 'background',
      label: { vi: 'Ảnh nền', en: 'Background image' },
      required: false,
      ratio: '9:16',
      minPx: 720,
      accept: ['image'],
    },
    {
      key: 'centerLogo',
      label: { vi: 'Logo tâm vòng quay', en: 'Center logo' },
      required: false,
      ratio: '1:1',
      minPx: 128,
      brandable: true,
      transparent: true,
      accept: ['image'],
    },
  ],
  skins: [
    {
      key: 'chung',
      name: { vi: 'Mặc định', en: 'Default' },
      tags: ['chung'],
      assets: {},
    },
    {
      key: 'tet',
      name: { vi: 'Tết Rực Rỡ', en: 'Lunar New Year' },
      tags: ['tet'],
      assets: {},
      config: {
        segments: [
          {
            label: { vi: 'Lộc Xuân', en: 'Spring Fortune' },
            color: '#DC2626',
            prizeSlot: 'prize-1',
          },
          {
            label: { vi: 'Chúc Năm Mới', en: 'Happy New Year' },
            color: '#991B1B',
            prizeSlot: 'none',
          },
          {
            label: { vi: 'Lì Xì Vàng', en: 'Golden Envelope' },
            color: '#F59E0B',
            prizeSlot: 'prize-2',
          },
          {
            label: { vi: 'An Khang', en: 'Peace & Health' },
            color: '#7F1D1D',
            prizeSlot: 'none',
          },
          {
            label: { vi: 'Quà Tết', en: 'Tet Gift' },
            color: '#D97706',
            prizeSlot: 'prize-3',
          },
          {
            label: { vi: 'Thịnh Vượng', en: 'Prosperity' },
            color: '#991B1B',
            prizeSlot: 'none',
          },
        ],
      },
    },
  ],
  hotEditable: ['copy.title', 'copy.cta'],
  server: spinWheelServer,
});
