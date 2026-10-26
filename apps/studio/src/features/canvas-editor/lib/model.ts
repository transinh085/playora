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
export type LoopAnimation = 'none' | 'pulse' | 'wiggle' | 'float';
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
  animation: {
    enter: EnterAnimation;
    delayMs: number;
    loop?: LoopAnimation;
  };
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
  letterSpacing?: number;
  textShadow?: 'none' | 'soft' | 'retro3d' | 'glow' | 'outline';
  textTransform?: 'none' | 'uppercase' | 'capitalize';
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  fit: 'cover' | 'contain';
  radius: number;
  shadow?: 'none' | 'soft' | 'strong' | 'glow';
  borderWidth?: number;
  borderColor?: ColorValue;
}

export interface ButtonElement extends BaseElement {
  type: 'button';
  label: string;
  action: ButtonAction;
  actionTarget?: string;
  variant?: 'game3d' | 'flat' | 'glow' | 'gradient';
  icon?: 'none' | 'zap' | 'gift' | 'pointer' | 'arrow' | 'star';
  background: ColorValue;
  color: ColorValue;
  radius: number;
  fontSize: number;
  letterSpacing?: number;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'pill' | 'ribbon' | 'card';
  fill: ColorValue;
  fillGradientTo?: ColorValue;
  radius: number;
  borderWidth: number;
  borderColor: ColorValue;
  shadow?: 'none' | 'soft' | 'card' | 'glow';
}

export interface CountdownElement extends BaseElement {
  type: 'countdown';
  variant?: 'cards' | 'pill' | 'minimal';
  title?: string;
  color: ColorValue;
  background: ColorValue;
  showDays?: boolean;
  showSeconds?: boolean;
}

export interface PrizeListElement extends BaseElement {
  type: 'prizeList';
  layout: 'grid' | 'list';
  title?: string;
  showRemaining: boolean;
  color: ColorValue;
  cardBackground?: ColorValue;
  cardBorder?: boolean;
}

export interface BadgeElement extends BaseElement {
  type: 'badge';
  text: string;
  variant: 'filled' | 'outline' | 'gradient';
  icon: 'none' | 'flame' | 'gift' | 'sparkles' | 'trophy' | 'zap' | 'star';
  color: ColorValue;
  background: ColorValue;
  borderColor?: ColorValue;
  radius: number;
  fontSize: number;
  pulse?: boolean;
}

export interface MarqueeElement extends BaseElement {
  type: 'marquee';
  text: string;
  speed: 'slow' | 'normal' | 'fast';
  icon: 'megaphone' | 'trophy' | 'sparkles' | 'flame';
  color: ColorValue;
  background: ColorValue;
  radius: number;
  fontSize: number;
}

export interface DividerElement extends BaseElement {
  type: 'divider';
  style: 'solid' | 'dashed' | 'dotted' | 'gradient' | 'ornament';
  ornament: 'none' | 'star' | 'diamond' | 'flower';
  color: ColorValue;
  thickness: number;
}

export interface AudioElement extends BaseElement {
  type: 'audio';
  color: ColorValue;
  background: ColorValue;
  label?: string;
  radius: number;
}

export interface SocialElement extends BaseElement {
  type: 'social';
  channel: 'zalo' | 'phone' | 'facebook' | 'website';
  label: string;
  url?: string;
  color: ColorValue;
  background: ColorValue;
  radius: number;
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
  | BadgeElement
  | MarqueeElement
  | ShapeElement
  | DividerElement
  | CountdownElement
  | PrizeListElement
  | AudioElement
  | SocialElement
  | GameStageElement
  | FormElement;

export type ElementType = CanvasElement['type'];

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
    key: 'trophy',
    src: svg(
      '<path d="M28 20 h44 v28 a22 22 0 0 1 -44 0 Z" fill="#ffd43b" stroke="#f59f00" stroke-width="4"/><path d="M28 28 h-10 a8 8 0 0 0 0 16 h10 M72 28 h10 a8 8 0 0 1 0 16 h-10" fill="none" stroke="#f59f00" stroke-width="4"/><path d="M44 48 v18 h12 v-18 M32 66 h36 v10 h-36 Z" fill="#ffd43b" stroke="#f59f00" stroke-width="3"/>',
    ),
  },
  {
    key: 'fire',
    src: svg(
      '<path d="M50 12 C55 28 72 38 72 58 C72 74 62 86 50 86 C38 86 28 74 28 58 C28 42 42 32 45 22 C46 26 48 30 52 30 C52 24 50 16 50 12 Z" fill="#ff922b"/><path d="M50 42 C54 50 62 56 62 66 C62 74 56 80 50 80 C44 80 38 74 38 66 C38 56 46 50 50 42 Z" fill="#ffd43b"/>',
    ),
  },
  {
    key: 'diamond',
    src: svg(
      '<polygon points="50,15 85,42 50,85 15,42" fill="#74c0fc" stroke="#1c7ed6" stroke-width="3"/><polygon points="50,15 68,42 50,85 32,42" fill="#a5d8ff"/><line x1="15" y1="42" x2="85" y2="42" stroke="#1c7ed6" stroke-width="2"/>',
    ),
  },
  {
    key: 'ribbon',
    src: svg(
      '<path d="M20 30 L50 18 L80 30 L80 75 L50 60 L20 75 Z" fill="#e03131"/><circle cx="50" cy="38" r="14" fill="#ffd43b"/><text x="50" y="44" text-anchor="middle" font-size="16" font-weight="900" fill="#c92a2a">★</text>',
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
