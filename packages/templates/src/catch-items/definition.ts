import { defineTemplate, field, type SkillServerModule } from '@playora/game-sdk/server';
import { z } from 'zod';

export const catchItemsConfigSchema = z.object({
  durationSeconds: field.slider({
    min: 10,
    max: 60,
    step: 5,
    int: true,
    default: 30,
    group: 'gameplay',
    label: { vi: 'Thời gian chơi (giây)', en: 'Game duration (seconds)' },
  }),
  targetScore: field.slider({
    min: 30,
    max: 500,
    step: 10,
    int: true,
    default: 100,
    group: 'gameplay',
    label: { vi: 'Điểm nhận quà', en: 'Target score for prize' },
  }),
  itemSpeed: field.slider({
    min: 2,
    max: 8,
    step: 1,
    int: true,
    default: 4,
    group: 'gameplay',
    label: { vi: 'Tốc độ rơi', en: 'Falling speed' },
  }),
  spawnIntervalMs: field.slider({
    min: 300,
    max: 1200,
    step: 50,
    int: true,
    default: 600,
    group: 'gameplay',
    label: { vi: 'Tần suất xuất hiện (ms)', en: 'Spawn interval (ms)' },
  }),
  backgroundImage: field
    .asset('game_background', {
      group: 'appearance',
      label: { vi: 'Ảnh nền sân chơi', en: 'Game background' },
    })
    .optional(),
  catcherImage: field
    .asset('player_catcher', {
      group: 'appearance',
      label: { vi: 'Hình ảnh giỏ hứng', en: 'Catcher image' },
    })
    .optional(),
  positiveItemImage: field
    .asset('item_positive', {
      group: 'appearance',
      label: { vi: 'Vật phẩm cộng điểm (+10đ)', en: 'Bonus item (+10 pts)' },
    })
    .optional(),
  negativeItemImage: field
    .asset('item_negative', {
      group: 'appearance',
      label: { vi: 'Chướng ngại vật/Bom (-10đ)', en: 'Obstacle / Bomb (-10 pts)' },
    })
    .optional(),
  copy: z
    .object({
      title: field.localized({
        label: { vi: 'Tiêu đề trò chơi', en: 'Game title' },
        default: { vi: 'Hứng Quà May Mắn', en: 'Catch Lucky Gifts' },
      }),
      instruction: field.localized({
        label: { vi: 'Hướng dẫn chơi', en: 'Instruction' },
        default: {
          vi: 'Di chuyển giỏ hứng quà (+10đ) và tránh chạm vào bom (-10đ)!',
          en: 'Move the basket to catch gifts (+10) and avoid bombs (-10)!',
        },
      }),
      cta: field.localized({
        label: { vi: 'Nút bắt đầu', en: 'Start button' },
        default: { vi: 'Chơi ngay', en: 'Play now' },
      }),
    })
    .default({
      title: { vi: 'Hứng Quà May Mắn', en: 'Catch Lucky Gifts' },
      instruction: {
        vi: 'Di chuyển giỏ hứng quà (+10đ) và tránh chạm vào bom (-10đ)!',
        en: 'Move the basket to catch gifts (+10) and avoid bombs (-10)!',
      },
      cta: { vi: 'Chơi ngay', en: 'Play now' },
    }),
});

export type CatchItemsConfig = z.infer<typeof catchItemsConfigSchema>;

export const catchItemsSubmissionSchema = z.object({
  score: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  itemsCaught: z.number().int().min(0),
  bombsHit: z.number().int().min(0),
});

export type CatchItemsSubmission = z.infer<typeof catchItemsSubmissionSchema>;

export const catchItemsServer: SkillServerModule<CatchItemsConfig, CatchItemsSubmission> = {
  submissionSchema: catchItemsSubmissionSchema,
  validate(sub, ctx) {
    const minDurationAllowed = Math.max(0, (ctx.config.durationSeconds ?? 30) * 1000 - 3000);
    if (sub.durationMs < minDurationAllowed) {
      return { ok: false, reason: 'duration_too_short' };
    }

    const interval = ctx.config.spawnIntervalMs ?? 600;
    const maxPossibleItems = Math.ceil(sub.durationMs / interval) + 3;
    const maxTheoreticalScore = maxPossibleItems * 10;

    if (sub.score > maxTheoreticalScore) {
      return { ok: false, reason: 'score_exceeds_theoretical_limit' };
    }

    return { ok: true, score: sub.score };
  },
  qualifies(score, config) {
    const target = config.targetScore ?? 100;
    return score >= target;
  },
};

export const catchItemsTemplate = defineTemplate({
  id: 'catch-items',
  version: '1.0.0',
  kind: 'skill',
  name: { vi: 'Hứng quà may mắn', en: 'Catch Lucky Gifts' },
  description: {
    vi: 'Minigame 2D kéo giỏ hứng quà và tích lũy điểm đổi voucher.',
    en: '2D minigame to catch falling gifts and score points for vouchers.',
  },
  thumbnail: '/templates/catch-items/thumb.png',
  tags: ['skill', '2d', 'fnb', 'chung'],
  configSchema: catchItemsConfigSchema,
  assetSlots: [
    {
      key: 'game_background',
      label: { vi: 'Ảnh nền sân chơi', en: 'Game background' },
      required: false,
      ratio: '9:16',
      minPx: 720,
      accept: ['image'],
    },
    {
      key: 'player_catcher',
      label: { vi: 'Giỏ hứng / Nhân vật', en: 'Player catcher' },
      required: false,
      ratio: '1:1',
      minPx: 128,
      transparent: true,
      accept: ['image'],
    },
    {
      key: 'item_positive',
      label: { vi: 'Vật phẩm cộng điểm (+10đ)', en: 'Bonus item (+10 pts)' },
      required: false,
      ratio: '1:1',
      minPx: 64,
      transparent: true,
      accept: ['image'],
    },
    {
      key: 'item_negative',
      label: { vi: 'Chướng ngại vật / Bom (-10đ)', en: 'Obstacle / Bomb (-10 pts)' },
      required: false,
      ratio: '1:1',
      minPx: 64,
      transparent: true,
      accept: ['image'],
    },
  ],
  skins: [
    {
      key: 'everyday',
      name: { vi: 'Mặc định (Trà sữa)', en: 'Default (Boba)' },
      tags: ['everyday', 'fnb'],
      assets: {},
    },
    {
      key: 'tet',
      name: { vi: 'Tết Lộc Xuân', en: 'Lunar New Year' },
      tags: ['tet'],
      assets: {},
      config: {
        copy: {
          title: { vi: 'Hứng Lộc Đầu Năm', en: 'Catch Lunar Fortune' },
          instruction: {
            vi: 'Hứng bao lì xì đỏ (+10đ), cẩn thận tránh pháo nổ (-10đ)!',
            en: 'Catch red envelopes (+10) and dodge firecrackers (-10)!',
          },
          cta: { vi: 'Hái Lộc Ngay', en: 'Catch Now' },
        },
      },
    },
  ],
  hotEditable: ['copy.title', 'copy.instruction', 'copy.cta'],
  server: catchItemsServer,
});
