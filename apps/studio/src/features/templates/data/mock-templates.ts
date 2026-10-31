import type { ChipColor } from '@playora/ui/components/base/badges/chip';
import { buildScreens, type SkinKey, type TemplateKey } from '@/features/builder-lab/lib/starter';
import {
  type BrandPalette,
  type CanvasDoc,
  type CanvasElement,
  createDemoDoc,
  DEMO_BRAND,
  presetSrc,
} from '@/features/canvas-editor/lib/model';

export type TemplateOccasion = 'all' | 'tet' | 'opening' | 'everyday';

export type TemplateMechanic =
  | 'all'
  | 'spin-wheel'
  | 'scratch-card'
  | 'gift-box'
  | 'flip-card'
  | 'egg-smash'
  | 'catch-items'
  | 'memory-match'
  | 'lucky-envelope';

export type TemplateVertical = 'all' | 'fnb' | 'cafe-milktea' | 'restaurant' | 'retail' | 'beauty';

export type TemplateGoal = 'all' | 'traffic' | 'retention' | 'leads' | 'clearance';

export interface CatalogSkinOption {
  key: string;
  name: string;
  color: string;
}

export interface CatalogTemplate {
  id: string;
  templateKey: TemplateKey;
  realTemplateKey: TemplateKey;
  name: string;
  skinKey: SkinKey;
  skinName: string;
  badgeTone: ChipColor;
  engineKind: 'instant' | 'skill';
  isReal: boolean;
  occasion: TemplateOccasion;
  mechanic: TemplateMechanic;
  vertical: TemplateVertical;
  goal: TemplateGoal;
  description: string;
  playDuration: string;
  difficulty: 'S' | 'M';
  recommendedWinRate: string;
  usageCount: string;
  completionRate: string;
  setupTime: string;
  brand: BrandPalette;
  screens: CanvasDoc;
  availableSkins: CatalogSkinOption[];
}

const SKINS_INFO: Record<SkinKey, { name: string; brand: BrandPalette }> = {
  tet: {
    name: 'Tết Đỏ Kim Tiền',
    brand: DEMO_BRAND,
  },
  'grand-opening': {
    name: 'Khai Trương Hồng Phát',
    brand: {
      primary: '#2b1a6e',
      accent: '#ffd43b',
      background: '#5f3dc4',
      text: '#ffffff',
      surface: '#3b2a8c',
    },
  },
  everyday: {
    name: 'Hiện đại Quanh năm',
    brand: {
      primary: '#0b5d5b',
      accent: '#ffd166',
      background: '#0f7c79',
      text: '#fffdf5',
      surface: '#0a4f4d',
    },
  },
};

/** Helper to generate valid CanvasDoc for upcoming M2 templates so they render pixel-accurately */
function buildMockScreenDoc(
  title: string,
  desc: string,
  gamePrompt: string,
  _skinKey: SkinKey,
): CanvasDoc {
  const doc = createDemoDoc();
  const patch = (elements: CanvasElement[], name: string, change: Partial<CanvasElement>) => {
    const idx = elements.findIndex((e) => e.name === name);
    if (idx !== -1 && elements[idx]) {
      elements[idx] = { ...elements[idx], ...change } as CanvasElement;
    }
  };

  patch(doc.cover.elements, 'Tiêu đề', { content: title, fontSize: 30 });
  patch(doc.cover.elements, 'Mô tả', { content: desc });
  patch(doc.cover.elements, 'Ảnh sản phẩm', { src: presetSrc('coffee') });

  patch(doc.game.elements, 'Tiêu đề', { content: gamePrompt });
  patch(doc.game.elements, 'Lượt còn lại', { content: 'Bạn còn 1 lượt tham gia' });

  return doc;
}

export const MOCK_TEMPLATES: CatalogTemplate[] = [
  // 1. Spin Wheel Tet
  {
    id: 'spin-wheel-tet',
    templateKey: 'spin-wheel',
    realTemplateKey: 'spin-wheel',
    name: 'Vòng quay May Mắn Tết',
    skinKey: 'tet',
    skinName: 'Tết Đỏ Kim Tiền',
    badgeTone: 'rose',
    engineKind: 'instant',
    isReal: true,
    occasion: 'tet',
    mechanic: 'spin-wheel',
    vertical: 'fnb',
    goal: 'traffic',
    description:
      'Vòng quay 8 ô màu xen kẽ quà và chúc may mắn. Máy chủ chọn giải trước, giao diện chỉ hiển thị hoạt cảnh quay dừng.',
    playDuration: '10–12 giây',
    difficulty: 'S',
    recommendedWinRate: '70–80%',
    usageCount: '2.4k',
    completionRate: '95%',
    setupTime: '~2 phút',
    brand: SKINS_INFO.tet.brand,
    screens: buildScreens('spin-wheel', 'tet'),
    availableSkins: [
      { key: 'tet', name: 'Tết Đỏ Kim Tiền', color: '#e11d48' },
      { key: 'grand-opening', name: 'Khai Trương Hồng Phát', color: '#f59e0b' },
      { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
    ],
  },
  // 2. Scratch Card Grand Opening
  {
    id: 'scratch-card-opening',
    templateKey: 'scratch-card',
    realTemplateKey: 'scratch-card',
    name: 'Thẻ Cào Khai Trương',
    skinKey: 'grand-opening',
    skinName: 'Khai Trương Hồng Phát',
    badgeTone: 'orange',
    engineKind: 'instant',
    isReal: true,
    occasion: 'opening',
    mechanic: 'scratch-card',
    vertical: 'cafe-milktea',
    goal: 'traffic',
    description:
      'Cào lớp nhũ trên màn hình cảm ứng. Cào lộ đạt 45% diện tích sẽ tự động công bố giải thưởng và cấp mã voucher.',
    playDuration: '8–10 giây',
    difficulty: 'S',
    recommendedWinRate: '80–90%',
    usageCount: '1.8k',
    completionRate: '92%',
    setupTime: '~2 phút',
    brand: SKINS_INFO['grand-opening'].brand,
    screens: buildScreens('scratch-card', 'grand-opening'),
    availableSkins: [
      { key: 'grand-opening', name: 'Khai Trương Hồng Phát', color: '#f59e0b' },
      { key: 'tet', name: 'Tết May Mắn', color: '#e11d48' },
      { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
    ],
  },
  // 3. Gift Box Everyday
  {
    id: 'gift-box-everyday',
    templateKey: 'gift-box',
    realTemplateKey: 'gift-box',
    name: 'Mở Hộp Quà Bí Mật',
    skinKey: 'everyday',
    skinName: 'Hiện đại Quanh năm',
    badgeTone: 'cyan',
    engineKind: 'instant',
    isReal: true,
    occasion: 'everyday',
    mechanic: 'gift-box',
    vertical: 'restaurant',
    goal: 'retention',
    description:
      '3 hộp quà ngẫu nhiên tại bàn. Người chơi chọn 1 hộp để nhận voucher dùng cho các món trong menu.',
    playDuration: '5–8 giây',
    difficulty: 'S',
    recommendedWinRate: '60–75%',
    usageCount: '1.2k',
    completionRate: '94%',
    setupTime: '~1 phút',
    brand: SKINS_INFO.everyday.brand,
    screens: buildScreens('gift-box', 'everyday'),
    availableSkins: [
      { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
      { key: 'grand-opening', name: 'Khai Trương', color: '#f59e0b' },
      { key: 'tet', name: 'Hộp Quà Tết', color: '#e11d48' },
    ],
  },
  // 4. Spin Wheel Grand Opening
  {
    id: 'spin-wheel-opening',
    templateKey: 'spin-wheel',
    realTemplateKey: 'spin-wheel',
    name: 'Vòng Quay Mừng Khai Trương',
    skinKey: 'grand-opening',
    skinName: 'Khai Trương Hồng Phát',
    badgeTone: 'orange',
    engineKind: 'instant',
    isReal: true,
    occasion: 'opening',
    mechanic: 'spin-wheel',
    vertical: 'fnb',
    goal: 'traffic',
    description:
      'Bộ giao diện vòng quay rực rỡ chào đón chi nhánh mới. Thích hợp đặt standee quét mã tại bàn lễ tân khai trương.',
    playDuration: '10–12 giây',
    difficulty: 'S',
    recommendedWinRate: '85–95%',
    usageCount: '1.6k',
    completionRate: '96%',
    setupTime: '~2 phút',
    brand: SKINS_INFO['grand-opening'].brand,
    screens: buildScreens('spin-wheel', 'grand-opening'),
    availableSkins: [
      { key: 'grand-opening', name: 'Khai Trương Hồng Phát', color: '#f59e0b' },
      { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
    ],
  },
  // 5. Scratch Card Tet
  {
    id: 'scratch-card-tet',
    templateKey: 'scratch-card',
    realTemplateKey: 'scratch-card',
    name: 'Thẻ Cào Lộc Xuân',
    skinKey: 'tet',
    skinName: 'Tết Đỏ Kim Tiền',
    badgeTone: 'rose',
    engineKind: 'instant',
    isReal: true,
    occasion: 'tet',
    mechanic: 'scratch-card',
    vertical: 'retail',
    goal: 'traffic',
    description:
      'Mẫu cào thẻ lì xì đỏ đầu xuân, tích hợp ảnh sản phẩm và logo thương hiệu quán nổi bật trên artboard.',
    playDuration: '8–10 giây',
    difficulty: 'S',
    recommendedWinRate: '75–85%',
    usageCount: '1.5k',
    completionRate: '91%',
    setupTime: '~2 phút',
    brand: SKINS_INFO.tet.brand,
    screens: buildScreens('scratch-card', 'tet'),
    availableSkins: [
      { key: 'tet', name: 'Tết Đỏ Kim Tiền', color: '#e11d48' },
      { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
    ],
  },
  // 6. Gift Box Tet
  {
    id: 'gift-box-tet',
    templateKey: 'gift-box',
    realTemplateKey: 'gift-box',
    name: 'Hộp Quà May Mắn Đầu Năm',
    skinKey: 'tet',
    skinName: 'Tết Đỏ Kim Tiền',
    badgeTone: 'rose',
    engineKind: 'instant',
    isReal: true,
    occasion: 'tet',
    mechanic: 'gift-box',
    vertical: 'beauty',
    goal: 'traffic',
    description:
      'Trao quà đầu năm không cần quay số cơ học. Khách chỉ cần mở hộp quà để nhận mã giảm giá cho dịch vụ kế tiếp.',
    playDuration: '5–8 giây',
    difficulty: 'S',
    recommendedWinRate: '70–80%',
    usageCount: '980',
    completionRate: '93%',
    setupTime: '~1 phút',
    brand: SKINS_INFO.tet.brand,
    screens: buildScreens('gift-box', 'tet'),
    availableSkins: [
      { key: 'tet', name: 'Tết Đỏ Kim Tiền', color: '#e11d48' },
      { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
    ],
  },
  // 7. Spin Wheel Everyday
  {
    id: 'spin-wheel-everyday',
    templateKey: 'spin-wheel',
    realTemplateKey: 'spin-wheel',
    name: 'Vòng Quay Tri Ân Khách Hàng',
    skinKey: 'everyday',
    skinName: 'Hiện đại Quanh năm',
    badgeTone: 'cyan',
    engineKind: 'instant',
    isReal: true,
    occasion: 'everyday',
    mechanic: 'spin-wheel',
    vertical: 'restaurant',
    goal: 'retention',
    description:
      'Thiết kế trang nhã dùng quanh năm, màu sắc theo sát brand kit của quán mà không phụ thuộc chủ đề lễ hội.',
    playDuration: '10–12 giây',
    difficulty: 'S',
    recommendedWinRate: '65–75%',
    usageCount: '870',
    completionRate: '95%',
    setupTime: '~2 phút',
    brand: SKINS_INFO.everyday.brand,
    screens: buildScreens('spin-wheel', 'everyday'),
    availableSkins: [
      { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
      { key: 'grand-opening', name: 'Khai trương', color: '#f59e0b' },
    ],
  },
  // 8. Scratch Card Everyday
  {
    id: 'scratch-card-everyday',
    templateKey: 'scratch-card',
    realTemplateKey: 'scratch-card',
    name: 'Thẻ Cào Ngày Vắng Kích Cầu',
    skinKey: 'everyday',
    skinName: 'Hiện đại Quanh năm',
    badgeTone: 'cyan',
    engineKind: 'instant',
    isReal: true,
    occasion: 'everyday',
    mechanic: 'scratch-card',
    vertical: 'cafe-milktea',
    goal: 'retention',
    description:
      'Thẻ cào nhanh dành cho các khung giờ thấp điểm từ Thứ 2 đến Thứ 5, tặng topping hoặc giảm giá hoá đơn.',
    playDuration: '8–10 giây',
    difficulty: 'S',
    recommendedWinRate: '75–85%',
    usageCount: '760',
    completionRate: '90%',
    setupTime: '~2 phút',
    brand: SKINS_INFO.everyday.brand,
    screens: buildScreens('scratch-card', 'everyday'),
    availableSkins: [
      { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
      { key: 'grand-opening', name: 'Khai trương', color: '#f59e0b' },
    ],
  },
  // 9. Gift Box Grand Opening
  {
    id: 'gift-box-opening',
    templateKey: 'gift-box',
    realTemplateKey: 'gift-box',
    name: 'Hộp Quà Tri Ân Khai Trương',
    skinKey: 'grand-opening',
    skinName: 'Khai Trương Hồng Phát',
    badgeTone: 'orange',
    engineKind: 'instant',
    isReal: true,
    occasion: 'opening',
    mechanic: 'gift-box',
    vertical: 'retail',
    goal: 'traffic',
    description:
      'Bộ 3 hộp quà mừng mở cửa hàng, kèm lời chúc mừng khai trương và voucher giảm giá trực tiếp vào bill mua sắm.',
    playDuration: '5–8 giây',
    difficulty: 'S',
    recommendedWinRate: '85–95%',
    usageCount: '1.1k',
    completionRate: '94%',
    setupTime: '~2 phút',
    brand: SKINS_INFO['grand-opening'].brand,
    screens: buildScreens('gift-box', 'grand-opening'),
    availableSkins: [
      { key: 'grand-opening', name: 'Khai Trương Hồng Phát', color: '#f59e0b' },
      { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
    ],
  },
  // 10. Egg Smash (M2 Upcoming)
  {
    id: 'egg-smash-easter',
    templateKey: 'gift-box',
    realTemplateKey: 'gift-box',
    name: 'Đập Trứng Vàng (Giai đoạn M2)',
    skinKey: 'everyday',
    skinName: 'Hiện đại Quanh năm',
    badgeTone: 'yellow',
    engineKind: 'instant',
    isReal: false,
    occasion: 'everyday',
    mechanic: 'egg-smash',
    vertical: 'cafe-milktea',
    goal: 'traffic',
    description:
      'Renderer mới trên engine instant-win. Gõ vỡ quả trứng vàng để mở quà, không đụng vào prize engine.',
    playDuration: '8–12 giây',
    difficulty: 'S',
    recommendedWinRate: '70–80%',
    usageCount: '620',
    completionRate: '89%',
    setupTime: '~3 phút',
    brand: SKINS_INFO.everyday.brand,
    screens: buildMockScreenDoc(
      'ĐẬP TRỨNG\nVÀNG',
      'Gõ vỡ quả trứng rinh quà quầy',
      'Gõ để đập trứng',
      'everyday',
    ),
    availableSkins: [{ key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' }],
  },
  // 11. Catch Items (M2 Skill)
  {
    id: 'catch-items-milktea',
    templateKey: 'scratch-card',
    realTemplateKey: 'scratch-card',
    name: 'Hứng Quà Rơi (Giai đoạn M2)',
    skinKey: 'everyday',
    skinName: 'Hiện đại Quanh năm',
    badgeTone: 'purple',
    engineKind: 'skill',
    isReal: false,
    occasion: 'everyday',
    mechanic: 'catch-items',
    vertical: 'cafe-milktea',
    goal: 'retention',
    description:
      'Cơ chế kỹ năng 20–30s: hứng vật phẩm sản phẩm của quán rơi xuống màn hình. Đạt điểm ngưỡng sẽ nhận giải thưởng.',
    playDuration: '20–30 giây',
    difficulty: 'M',
    recommendedWinRate: '60–75%',
    usageCount: '450',
    completionRate: '86%',
    setupTime: '~3 phút',
    brand: SKINS_INFO.everyday.brand,
    screens: buildMockScreenDoc(
      'HỨNG TRÀ SỮA\nNHẬN QUÀ',
      'Nhanh tay hứng ly trà sữa đổi quà',
      'Di chuyển để hứng quà',
      'everyday',
    ),
    availableSkins: [{ key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' }],
  },
  // 12. Lucky Envelope (M2 Tet)
  {
    id: 'lucky-envelope-tet',
    templateKey: 'gift-box',
    realTemplateKey: 'gift-box',
    name: 'Rút Bao Lì Xì (Giai đoạn M2)',
    skinKey: 'tet',
    skinName: 'Tết Đỏ Kim Tiền',
    badgeTone: 'rose',
    engineKind: 'instant',
    isReal: false,
    occasion: 'tet',
    mechanic: 'lucky-envelope',
    vertical: 'retail',
    goal: 'traffic',
    description:
      'Phong bao lì xì treo trên cành mai. Khách chạm rút bao lì xì để mở ra lời chúc và quà tặng xuân.',
    playDuration: '6–8 giây',
    difficulty: 'S',
    recommendedWinRate: '85–95%',
    usageCount: '890',
    completionRate: '93%',
    setupTime: '~2 phút',
    brand: SKINS_INFO.tet.brand,
    screens: buildMockScreenDoc(
      'RÚT BAO\nLÌ XÌ TẾT',
      'Rút bao lì xì may mắn đầu năm',
      'Chạm để rút bao lì xì',
      'tet',
    ),
    availableSkins: [{ key: 'tet', name: 'Tết Đỏ Kim Tiền', color: '#e11d48' }],
  },
];
