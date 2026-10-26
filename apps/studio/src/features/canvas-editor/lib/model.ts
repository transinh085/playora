/**
 * Editor-only part of the canvas model (ADR-014): toolbox types, element factories and the demo
 * document. The shared types, `resolveColor` and the presets live in `@playora/ui/campaign` and are
 * re-exported here so the editor keeps one import path.
 */
import {
  ARTBOARD_WIDTH,
  type BaseElement,
  type BrandPalette,
  type ButtonAction,
  type ButtonElement,
  type CanvasDoc,
  type CanvasElement,
  type ColorValue,
  type CountdownElement,
  DEFAULT_ARTBOARD_HEIGHT,
  type ElementType,
  type ImageElement,
  type PrizeListElement,
  presetSrc,
  type TextElement,
} from '@playora/ui/campaign';

export {
  ARTBOARD_WIDTH,
  type AudioElement,
  type BadgeElement,
  type BaseElement,
  type BrandColorKey,
  type BrandPalette,
  type ButtonAction,
  type ButtonElement,
  type CanvasDoc,
  type CanvasElement,
  type ColorValue,
  type CountdownElement,
  DEFAULT_ARTBOARD_HEIGHT,
  DEMO_PRIZES,
  type DividerElement,
  type ElementType,
  type EnterAnimation,
  type FormElement,
  type GameStageElement,
  IMAGE_PRESETS,
  type ImageElement,
  type LoopAnimation,
  MAX_ARTBOARD_HEIGHT,
  type MarqueeElement,
  MIN_ARTBOARD_HEIGHT,
  type PrizeListElement,
  presetSrc,
  resolveColor,
  SCREEN_KEYS,
  type ScreenDoc,
  type ScreenKey,
  type ShapeElement,
  SLOT_KEYS,
  type SlotKey,
  type SocialElement,
  type TextElement,
} from '@playora/ui/campaign';

/** Elements a user can add from the toolbox; `gameStage` and `form` come with their screen. */
export const ADDABLE_TYPES = [
  'text',
  'image',
  'button',
  'badge',
  'marquee',
  'shape',
  'divider',
  'countdown',
  'prizeList',
  'audio',
  'social',
] as const;
export type AddableType = (typeof ADDABLE_TYPES)[number];

/** Exactly one per screen and never deleted: the template draws inside it. */
export const SINGLETON_TYPES: ElementType[] = ['gameStage', 'form'];

let counter = 0;
export function newId(): string {
  counter += 1;
  return `el_${Date.now().toString(36)}_${counter}`;
}

const base = (name: string, x: number, y: number, w: number, h: number): BaseElement => ({
  id: newId(),
  name,
  x,
  y,
  w,
  h,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  animation: { enter: 'none', delayMs: 0 },
});

/** A new element of `type`, centred on (cx, cy). */
export function createElement(
  type: AddableType,
  cx: number,
  cy: number,
  name: string,
): CanvasElement {
  const at = (w: number, h: number) =>
    base(name, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  switch (type) {
    case 'text':
      return {
        ...at(240, 40),
        type,
        content: name,
        font: 'body',
        fontSize: 20,
        fontWeight: 600,
        color: 'brand.text',
        align: 'center',
        lineHeight: 1.25,
      };
    case 'image':
      return { ...at(120, 120), type, src: presetSrc(), fit: 'contain', radius: 0 };
    case 'button':
      return {
        ...at(220, 52),
        type,
        label: name,
        action: 'start',
        background: 'brand.accent',
        color: 'brand.primary',
        radius: 26,
        fontSize: 18,
      };
    case 'shape':
      return {
        ...at(160, 100),
        type,
        shape: 'rect',
        fill: 'brand.surface',
        radius: 16,
        borderWidth: 0,
        borderColor: 'brand.accent',
      };
    case 'badge':
      return {
        ...at(180, 36),
        type,
        text: '🔥 100% TRÚNG QUÀ',
        variant: 'filled',
        icon: 'flame',
        color: 'brand.primary',
        background: 'brand.accent',
        borderColor: 'brand.accent',
        radius: 18,
        fontSize: 13,
        pulse: true,
      };
    case 'marquee':
      return {
        ...at(340, 32),
        type,
        text: '🎉 098****123 vừa trúng iPhone 16  •  🎁 Minh Anh vừa nhận Voucher 100K  •  ⭐ 091****890 vừa trúng Ly sứ',
        speed: 'normal',
        icon: 'megaphone',
        color: 'brand.text',
        background: 'brand.surface',
        radius: 16,
        fontSize: 12,
      };
    case 'divider':
      return {
        ...at(280, 24),
        type,
        style: 'ornament',
        ornament: 'star',
        color: 'brand.accent',
        thickness: 2,
      };
    case 'audio':
      return {
        ...at(44, 44),
        type,
        color: 'brand.primary',
        background: 'brand.accent',
        label: '',
        radius: 22,
      };
    case 'social':
      return {
        ...at(220, 42),
        type,
        channel: 'zalo',
        label: 'Liên hệ qua Zalo OA',
        url: '',
        color: '#ffffff',
        background: '#0068ff',
        radius: 21,
      };
    case 'countdown':
      return {
        ...at(280, 68),
        type,
        variant: 'cards',
        title: 'ƯU ĐÃI KẾT THÚC SAU',
        color: 'brand.text',
        background: 'brand.surface',
        showDays: true,
        showSeconds: true,
      };
    case 'prizeList':
      return {
        ...at(327, 130),
        type,
        layout: 'grid',
        title: 'GIẢI THƯỞNG HẤP DẪN',
        showRemaining: true,
        color: 'brand.text',
        cardBackground: 'brand.surface',
        cardBorder: true,
      };
  }
}

export const DEMO_BRAND: BrandPalette = {
  primary: '#8f1d14',
  accent: '#f7c948',
  background: '#b3261e',
  text: '#fff8e1',
  surface: '#7a1d12',
};

/** Default Tết screens a template would ship for its skin. */
export function createDemoDoc(): CanvasDoc {
  const bg = { color: 'brand.background' as ColorValue, gradientTo: 'brand.primary' as ColorValue };
  const text = (
    name: string,
    content: string,
    y: number,
    fontSize: number,
    extra: Partial<TextElement> = {},
  ): TextElement => {
    const lines = content.split('\n').length;
    const h = Math.round(fontSize * 1.25 * lines) + 4;
    return {
      ...(createElement('text', ARTBOARD_WIDTH / 2, y, name) as TextElement),
      content,
      fontSize,
      x: 20,
      w: ARTBOARD_WIDTH - 40,
      h,
      y: Math.round(y - h / 2),
      ...extra,
    };
  };
  const image = (
    name: string,
    preset: string,
    x: number,
    y: number,
    size: number,
    rotation = 0,
  ) => ({
    ...(createElement('image', 0, 0, name) as ImageElement),
    src: presetSrc(preset),
    x,
    y,
    w: size,
    h: size,
    rotation,
  });
  const button = (label: string, y: number, action: ButtonAction = 'start'): ButtonElement => ({
    ...(createElement('button', ARTBOARD_WIDTH / 2, y, label) as ButtonElement),
    x: Math.round((ARTBOARD_WIDTH - 280) / 2),
    w: 280,
    label,
    action,
    animation: { enter: 'bounce', delayMs: 400 },
  });

  return {
    cover: {
      height: DEFAULT_ARTBOARD_HEIGHT,
      background: bg,
      elements: [
        image('Đèn lồng trái', 'lantern', 8, -6, 70, -8),
        image('Đèn lồng phải', 'lantern', 297, -6, 70, 8),
        image('Logo quán', 'logo', 137, 48, 100),
        text('Tiêu đề', 'VÒNG QUAY\nTẾT 2027', 222, 38, {
          font: 'heading',
          fontWeight: 800,
          color: 'brand.accent',
          animation: { enter: 'zoom', delayMs: 100 },
        }),
        text('Mô tả', 'Quay là trúng — lì xì đầu năm\ntừ Cà phê Mộc', 300, 16, { fontWeight: 400 }),
        {
          ...(createElement(
            'prizeList',
            ARTBOARD_WIDTH / 2,
            410,
            'Danh sách quà',
          ) as PrizeListElement),
          animation: { enter: 'slideUp', delayMs: 250 },
        },
        {
          ...(createElement('countdown', ARTBOARD_WIDTH / 2, 530, 'Đếm ngược') as CountdownElement),
        },
        button('CHƠI NGAY', 620),
        image('Hoa mai', 'apricot', -20, 640, 110, -12),
        image('Bao lì xì', 'envelope', 300, 650, 80, 14),
      ],
    },
    form: {
      height: DEFAULT_ARTBOARD_HEIGHT,
      background: bg,
      elements: [
        image('Logo quán', 'logo', 147, 40, 80),
        text('Tiêu đề', 'Để lại thông tin\nnhận quà nhé!', 175, 26, {
          font: 'heading',
          fontWeight: 800,
          color: 'brand.accent',
        }),
        { ...base('Biểu mẫu', 24, 230, 327, 300), type: 'form', color: 'brand.text' },
        button('TIẾP TỤC', 590, 'next'),
        image('Hoa mai', 'apricot', 280, 660, 100, 10),
      ],
    },
    game: {
      height: DEFAULT_ARTBOARD_HEIGHT,
      background: bg,
      elements: [
        text('Tiêu đề', 'Chạm để quay!', 70, 28, {
          font: 'heading',
          fontWeight: 800,
          color: 'brand.accent',
        }),
        { ...base('Khu vực game', 22, 120, 331, 331), type: 'gameStage' },
        text('Lượt còn lại', 'Bạn còn 1 lượt quay', 490, 16, { fontWeight: 400 }),
        image('Đèn lồng', 'lantern', 300, 560, 70, 10),
        image('Đồng xu', 'coin', 20, 600, 60),
      ],
    },
    resultWin: {
      height: DEFAULT_ARTBOARD_HEIGHT,
      background: bg,
      elements: [
        image('Bao lì xì', 'envelope', 117, 80, 140),
        text('Chúc mừng', 'CHÚC MỪNG!', 270, 36, {
          font: 'heading',
          fontWeight: 800,
          color: 'brand.accent',
          animation: { enter: 'zoom', delayMs: 0 },
        }),
        text('Tên quà', 'Bạn nhận được {prize.name}', 330, 20),
        text('Hướng dẫn', 'Đưa mã này cho nhân viên\ntại quầy để đổi quà', 385, 15, {
          fontWeight: 400,
        }),
        button('XEM MÃ ĐỔI QUÀ', 480, 'next'),
        image('Hoa mai', 'apricot', -10, 600, 120, -10),
      ],
    },
    resultLose: {
      height: DEFAULT_ARTBOARD_HEIGHT,
      background: bg,
      elements: [
        image('Ly cà phê', 'coffee', 127, 100, 120),
        text('Tiêu đề', 'Tiếc quá!', 280, 34, {
          font: 'heading',
          fontWeight: 800,
          color: 'brand.accent',
        }),
        text('Mô tả', 'Hẹn bạn ngày mai —\nmỗi ngày 1 lượt quay', 340, 16, { fontWeight: 400 }),
        button('GỌI ZALO ĐẶT BÀN', 440, 'zalo'),
      ],
    },
  };
}
