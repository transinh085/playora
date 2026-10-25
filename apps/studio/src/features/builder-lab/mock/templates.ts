import {
  type BrandPalette,
  type CanvasDoc,
  type CanvasElement,
  createDemoDoc,
  DEMO_BRAND,
  presetSrc,
  type SlotKey,
} from '@/features/canvas-editor/lib/model';
import type {
  Industry,
  LabPrize,
  LabRules,
  SkinInfo,
  SkinKey,
  TemplateInfo,
  TemplateKey,
} from './types';

const SKINS: Record<SkinKey, SkinInfo> = {
  tet: { key: 'tet', occasion: 'tet', brand: DEMO_BRAND },
  'grand-opening': {
    key: 'grand-opening',
    occasion: 'opening',
    brand: {
      primary: '#2b1a6e',
      accent: '#ffd43b',
      background: '#5f3dc4',
      text: '#ffffff',
      surface: '#3b2a8c',
    },
  },
  everyday: {
    key: 'everyday',
    occasion: 'everyday',
    brand: {
      primary: '#0b5d5b',
      accent: '#ffd166',
      background: '#0f7c79',
      text: '#fffdf5',
      surface: '#0a4f4d',
    },
  },
};

const ALL_INDUSTRIES: Industry[] = ['fnb', 'beauty', 'retail', 'fitness'];

export const TEMPLATES: TemplateInfo[] = (['spin-wheel', 'scratch-card', 'gift-box'] as const).map(
  (key) => ({
    key,
    mechanism: key,
    industries: ALL_INDUSTRIES,
    skins: [SKINS.tet, SKINS['grand-opening'], SKINS.everyday],
  }),
);

export function getTemplate(key: TemplateKey): TemplateInfo {
  const template = TEMPLATES.find((t) => t.key === key);
  if (!template) throw new Error(`Unknown template ${key}`);
  return template;
}

export function getSkin(key: SkinKey): SkinInfo {
  return SKINS[key];
}

/** Default copy per template × skin (Vietnamese demo content, like seed data). */
const MECH_TITLE: Record<TemplateKey, string> = {
  'spin-wheel': 'VÒNG QUAY',
  'scratch-card': 'THẺ CÀO',
  'gift-box': 'MỞ HỘP QUÀ',
};
const OCCASION_LINE: Record<SkinKey, string> = {
  tet: 'TẾT 2027',
  'grand-opening': 'KHAI TRƯƠNG',
  everyday: 'MAY MẮN',
};
const PROMO_LINE: Record<SkinKey, string> = {
  tet: 'lì xì đầu năm\ntừ Cà phê Mộc',
  'grand-opening': 'mừng khai trương\nchi nhánh mới của Cà phê Mộc',
  everyday: 'ghé Cà phê Mộc\nlà có quà mang về',
};
const PROMO_VERB: Record<TemplateKey, string> = {
  'spin-wheel': 'Quay là trúng',
  'scratch-card': 'Cào là trúng',
  'gift-box': 'Mở là có quà',
};

const TURN_NOUN: Record<TemplateKey, string> = {
  'spin-wheel': 'lượt quay',
  'scratch-card': 'lượt cào',
  'gift-box': 'lượt mở quà',
};

const GAME_PROMPT: Record<TemplateKey, string> = {
  'spin-wheel': 'Chạm để quay!',
  'scratch-card': 'Cào để nhận quà!',
  'gift-box': 'Chọn một hộp quà!',
};
const STICKERS: Record<SkinKey, [string, string, string]> = {
  tet: ['lantern', 'apricot', 'envelope'],
  'grand-opening': ['balloon', 'star', 'gift'],
  everyday: ['star', 'coin', 'gift'],
};
const STAGE_BOX: Record<TemplateKey, { x: number; y: number; w: number; h: number }> = {
  'spin-wheel': { x: 22, y: 120, w: 331, h: 331 },
  'scratch-card': { x: 24, y: 160, w: 327, h: 230 },
  'gift-box': { x: 24, y: 150, w: 327, h: 260 },
};

/**
 * The screens a template ships for a skin, with replaceable slots marked (docs/15 §4.1). Built
 * from the canvas demo layout so editor and lab share one source of defaults.
 */
export function buildScreens(templateKey: TemplateKey, skinKey: SkinKey): CanvasDoc {
  const doc = createDemoDoc();
  const [deco1, deco2, deco3] = STICKERS[skinKey];
  const title = `${MECH_TITLE[templateKey]}\n${OCCASION_LINE[skinKey]}`;

  const patch = (elements: CanvasElement[], name: string, change: Partial<CanvasElement>) => {
    const index = elements.findIndex((e) => e.name === name);
    const current = elements[index];
    if (current) elements[index] = { ...current, ...change } as CanvasElement;
  };
  const slot = (elements: CanvasElement[], name: string, key: SlotKey) =>
    patch(elements, name, { slot: key });

  const cover = doc.cover.elements;
  patch(cover, 'Đèn lồng trái', { src: presetSrc(deco1) });
  patch(cover, 'Đèn lồng phải', { src: presetSrc(deco1) });
  patch(cover, 'Hoa mai', { src: presetSrc(deco2) });
  // Shrink-to-fit for the wide display face: ~0.95em per glyph on a 335px line (docs/15 §4.3).
  const longest = Math.max(...title.split('\n').map((line) => line.length));
  patch(cover, 'Tiêu đề', {
    content: title,
    fontSize: Math.min(38, Math.floor(335 / (longest * 0.95))),
  });
  patch(cover, 'Mô tả', {
    content: `${PROMO_VERB[templateKey]} — ${PROMO_LINE[skinKey]}`,
  });
  // The red envelope on the cover becomes the shop's own product photo.
  patch(cover, 'Bao lì xì', { name: 'Ảnh sản phẩm', src: presetSrc('coffee'), rotation: 8 });
  slot(cover, 'Logo quán', 'logo');
  slot(cover, 'Tiêu đề', 'title');
  slot(cover, 'Mô tả', 'promoText');
  slot(cover, 'CHƠI NGAY', 'cta');
  slot(cover, 'Ảnh sản phẩm', 'productPhoto');

  const form = doc.form.elements;
  slot(form, 'Logo quán', 'logo');
  patch(form, 'Hoa mai', { src: presetSrc(deco2) });

  const game = doc.game.elements;
  patch(game, 'Tiêu đề', { content: GAME_PROMPT[templateKey] });
  patch(game, 'Khu vực game', STAGE_BOX[templateKey]);
  patch(game, 'Đèn lồng', { src: presetSrc(deco1) });
  patch(game, 'Đồng xu', { src: presetSrc(deco3) });

  patch(game, 'Lượt còn lại', { content: `Bạn còn 1 ${TURN_NOUN[templateKey]}` });
  patch(doc.resultLose.elements, 'Mô tả', {
    content: `Hẹn bạn ngày mai —\nmỗi ngày 1 ${TURN_NOUN[templateKey]}`,
  });

  patch(doc.resultWin.elements, 'Bao lì xì', { name: 'Hình quà', src: presetSrc(deco3) });
  patch(doc.resultWin.elements, 'Hoa mai', { src: presetSrc(deco2) });

  return doc;
}

/** Starter prizes for a café; owners rename and restock them in "Rules & prizes". */
export function defaultPrizes(): LabPrize[] {
  return [
    {
      id: 'p1',
      name: 'Ly cà phê muối',
      image: presetSrc('coffee'),
      quantity: 100,
      valueVnd: 30_000,
      probability: 0.25,
    },
    {
      id: 'p2',
      name: 'Voucher 50K',
      image: presetSrc('gift'),
      quantity: 40,
      valueVnd: 50_000,
      probability: 0.1,
    },
    {
      id: 'p3',
      name: 'Bình giữ nhiệt',
      image: presetSrc('star'),
      quantity: 8,
      valueVnd: 250_000,
      probability: 0.02,
    },
  ];
}

export function defaultRules(now = new Date()): LabRules {
  const ends = new Date(now.getTime() + 14 * 86_400_000);
  return {
    mode: 'overall_win_rate',
    overallWinRate: 0.35,
    playsPerDay: 1,
    maxWinsPerPlayer: 1,
    startsAt: now.toISOString(),
    endsAt: ends.toISOString(),
    openingHours: { start: '07:00', end: '22:00' },
    pacing: true,
    budgetVnd: null,
    collectForm: true,
  };
}

export function skinBrand(skinKey: SkinKey): BrandPalette {
  return { ...SKINS[skinKey].brand };
}
