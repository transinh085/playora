/**
 * Canvas screen documents (ADR-014). Prototype-only types: once the UX is validated they move to
 * `packages/contracts` as zod schemas and `CanvasScreen` moves to `@playora/ui/game`.
 */

export const ARTBOARD_WIDTH = 375;
export const DEFAULT_ARTBOARD_HEIGHT = 750;
export const MIN_ARTBOARD_HEIGHT = 667;
export const MAX_ARTBOARD_HEIGHT = 2000;

export type ScreenKey = 'cover' | 'form' | 'game' | 'resultWin' | 'resultLose';
export const SCREEN_KEYS: ScreenKey[] = ['cover', 'form', 'game', 'resultWin', 'resultLose'];

/** A brand token reference (follows the brand kit) or a literal hex colour. */
export type ColorValue = `brand.${BrandColorKey}` | `#${string}`;
export type BrandColorKey = 'primary' | 'accent' | 'background' | 'text' | 'surface';

export type EnterAnimation = 'none' | 'fade' | 'slideUp' | 'zoom' | 'bounce';
export type ButtonAction = 'start' | 'rules' | 'link' | 'zalo' | 'phone' | 'next';

/**
 * Replaceable content a template exposes to "Quick edit" (docs/product/specs/builder.md §4.2). Elements sharing a slot
 * across screens are edited together: change the logo once, every screen follows.
 */
export type SlotKey = 'logo' | 'productPhoto' | 'title' | 'promoText' | 'cta';
export const SLOT_KEYS: SlotKey[] = ['logo', 'productPhoto', 'title', 'promoText', 'cta'];

interface BaseElement {
  id: string;
  slot?: SlotKey;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  animation: { enter: EnterAnimation; delayMs: number };
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  font: 'heading' | 'body';
  fontSize: number;
  fontWeight: 400 | 600 | 800;
  color: ColorValue;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fit: 'cover' | 'contain';
  radius: number;
}

export interface ButtonElement extends BaseElement {
  type: 'button';
  label: string;
  action: ButtonAction;
  background: ColorValue;
  color: ColorValue;
  radius: number;
  fontSize: number;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rect' | 'ellipse';
  fill: ColorValue;
  radius: number;
  borderWidth: number;
  borderColor: ColorValue;
}

export interface CountdownElement extends BaseElement {
  type: 'countdown';
  color: ColorValue;
  background: ColorValue;
}

export interface PrizeListElement extends BaseElement {
  type: 'prizeList';
  layout: 'grid' | 'list';
  showRemaining: boolean;
  color: ColorValue;
}

export interface GameStageElement extends BaseElement {
  type: 'gameStage';
}

export interface FormElement extends BaseElement {
  type: 'form';
  color: ColorValue;
}

export type CanvasElement =
  | TextElement
  | ImageElement
  | ButtonElement
  | ShapeElement
  | CountdownElement
  | PrizeListElement
  | GameStageElement
  | FormElement;

export type ElementType = CanvasElement['type'];

/** Elements a user can add from the toolbox; `gameStage` and `form` come with their screen. */
export const ADDABLE_TYPES = [
  'text',
  'image',
  'button',
  'shape',
  'countdown',
  'prizeList',
] as const;
export type AddableType = (typeof ADDABLE_TYPES)[number];

/** Exactly one per screen and never deleted: the template draws inside it. */
export const SINGLETON_TYPES: ElementType[] = ['gameStage', 'form'];

export interface ScreenDoc {
  height: number;
  background: { color: ColorValue; gradientTo?: ColorValue; image?: string };
  elements: CanvasElement[];
}

export type CanvasDoc = Record<ScreenKey, ScreenDoc>;

export type BrandPalette = Record<BrandColorKey, string>;

export function resolveColor(value: ColorValue, brand: BrandPalette): string {
  return value.startsWith('brand.') ? brand[value.slice(6) as BrandColorKey] : value;
}

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
    case 'countdown':
      return { ...at(260, 64), type, color: 'brand.text', background: 'brand.surface' };
    case 'prizeList':
      return { ...at(327, 120), type, layout: 'grid', showRemaining: true, color: 'brand.text' };
  }
}

const svg = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`)}`;

/** Built-in stickers so the prototype works without uploads. */
export const IMAGE_PRESETS: { key: string; src: string }[] = [
  {
    key: 'logo',
    src: svg(
      '<circle cx="50" cy="50" r="46" fill="#fff8e1" stroke="#f5b301" stroke-width="4"/><text x="50" y="44" text-anchor="middle" font-family="Georgia" font-size="16" font-weight="700" fill="#7a1d12">CÀ PHÊ</text><text x="50" y="66" text-anchor="middle" font-family="Georgia" font-size="20" font-weight="700" fill="#7a1d12">MỘC</text>',
    ),
  },
  {
    key: 'apricot',
    src: svg(
      '<g fill="#ffd23f">' +
        [0, 72, 144, 216, 288]
          .map((a) => `<ellipse cx="50" cy="28" rx="15" ry="22" transform="rotate(${a} 50 50)"/>`)
          .join('') +
        '</g><circle cx="50" cy="50" r="10" fill="#e8590c"/>',
    ),
  },
  {
    key: 'envelope',
    src: svg(
      '<rect x="20" y="8" width="60" height="84" rx="6" fill="#d62828"/><path d="M20 30 L50 48 L80 30" fill="none" stroke="#f7c948" stroke-width="3"/><circle cx="50" cy="60" r="12" fill="#f7c948"/><text x="50" y="65" text-anchor="middle" font-size="14" font-weight="700" fill="#d62828">福</text>',
    ),
  },
  {
    key: 'lantern',
    src: svg(
      '<line x1="50" y1="0" x2="50" y2="14" stroke="#7a1d12" stroke-width="3"/><rect x="38" y="12" width="24" height="6" fill="#f7c948"/><ellipse cx="50" cy="50" rx="30" ry="32" fill="#e03131"/><rect x="38" y="80" width="24" height="6" fill="#f7c948"/><path d="M44 86 L44 98 M50 86 L50 100 M56 86 L56 98" stroke="#f7c948" stroke-width="2"/>',
    ),
  },
  {
    key: 'coin',
    src: svg(
      '<circle cx="50" cy="50" r="44" fill="#f7c948" stroke="#c99700" stroke-width="5"/><rect x="40" y="40" width="20" height="20" fill="none" stroke="#c99700" stroke-width="5"/>',
    ),
  },
  {
    key: 'coffee',
    src: svg(
      '<path d="M18 38 H72 V70 a18 18 0 0 1 -18 18 H36 a18 18 0 0 1 -18 -18 Z" fill="#fff8e1" stroke="#6f4518" stroke-width="4"/><path d="M72 46 h8 a10 10 0 0 1 0 20 h-8" fill="none" stroke="#6f4518" stroke-width="6"/><rect x="24" y="44" width="42" height="10" fill="#a0673a"/><path d="M34 10 q6 8 0 16 M46 10 q6 8 0 16 M58 10 q6 8 0 16" fill="none" stroke="#c8a27c" stroke-width="4" stroke-linecap="round"/>',
    ),
  },
  {
    key: 'gift',
    src: svg(
      '<rect x="12" y="40" width="76" height="52" rx="6" fill="#e64980"/><rect x="6" y="28" width="88" height="18" rx="5" fill="#f783ac"/><rect x="44" y="28" width="12" height="64" fill="#ffd43b"/><path d="M50 28 C38 6 18 14 30 26 Z M50 28 C62 6 82 14 70 26 Z" fill="#ffd43b"/>',
    ),
  },
  {
    key: 'star',
    src: svg(
      '<path d="M50 6 L62 38 L96 40 L69 61 L79 94 L50 75 L21 94 L31 61 L4 40 L38 38 Z" fill="#ffd43b" stroke="#f59f00" stroke-width="3" stroke-linejoin="round"/>',
    ),
  },
  {
    key: 'balloon',
    src: svg(
      '<ellipse cx="38" cy="36" rx="22" ry="27" fill="#4dabf7"/><ellipse cx="64" cy="40" rx="22" ry="27" fill="#ff8787"/><path d="M38 63 Q42 80 50 98 M64 67 Q58 82 50 98" fill="none" stroke="#868e96" stroke-width="2"/>',
    ),
  },
];

/** Source of a built-in sticker by key (falls back to the first preset). */
export function presetSrc(key?: string): string {
  return (IMAGE_PRESETS.find((p) => p.key === key) ?? IMAGE_PRESETS[0])?.src ?? '';
}

export const DEMO_BRAND: BrandPalette = {
  primary: '#8f1d14',
  accent: '#f7c948',
  background: '#b3261e',
  text: '#fff8e1',
  surface: '#7a1d12',
};

export const DEMO_PRIZES = [
  { name: 'Ly cà phê muối', remaining: 120 },
  { name: 'Voucher 50K', remaining: 40 },
  { name: 'Bình giữ nhiệt', remaining: 8 },
];

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
