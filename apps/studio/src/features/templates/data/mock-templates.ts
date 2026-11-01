import { buildScreens, type SkinKey, type TemplateKey } from '@/features/builder-lab/lib/starter';
import { type BrandPalette, type CanvasDoc, DEMO_BRAND } from '@/features/canvas-editor/lib/model';

export type BadgeTone = 'rose' | 'orange' | 'cyan' | 'yellow' | 'purple';

export type TemplateOccasion = 'all' | 'tet' | 'opening' | 'everyday';

export type TemplateMechanic = 'all' | 'spin-wheel' | 'scratch-card' | 'gift-box';

export type TemplateVertical = 'all' | 'fnb' | 'cafe-milktea' | 'restaurant' | 'retail' | 'beauty';

export type TemplateGoal = 'all' | 'traffic' | 'retention' | 'leads' | 'clearance';

export interface CatalogSkinOption {
  key: SkinKey;
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
  badgeTone: BadgeTone;
  engineKind: 'instant' | 'skill';
  isReal: true;
  occasion: TemplateOccasion;
  mechanic: Exclude<TemplateMechanic, 'all'>;
  vertical: TemplateVertical;
  goal: TemplateGoal;
  description: string;
  playDuration: string;
  durationSeconds: number;
  difficulty: 'S' | 'M';
  recommendedWinRate: string;
  completionRate: string;
  setupTime: string;
  brand: BrandPalette;
  screens: CanvasDoc;
  availableSkins: CatalogSkinOption[];
}

export const SKINS_INFO: Record<SkinKey, { name: string; brand: BrandPalette }> = {
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

export const ALL_SKINS_OPTIONS: CatalogSkinOption[] = [
  { key: 'tet', name: 'Tết Đỏ Kim Tiền', color: '#e11d48' },
  { key: 'grand-opening', name: 'Khai Trương Hồng Phát', color: '#f59e0b' },
  { key: 'everyday', name: 'Hiện đại Quanh năm', color: '#0d9488' },
];

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
    durationSeconds: 10,
    difficulty: 'S',
    recommendedWinRate: '70–80%',
    completionRate: '95%',
    setupTime: '~2 phút',
    brand: SKINS_INFO.tet.brand,
    screens: buildScreens('spin-wheel', 'tet'),
    availableSkins: ALL_SKINS_OPTIONS,
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
    durationSeconds: 8,
    difficulty: 'S',
    recommendedWinRate: '80–90%',
    completionRate: '92%',
    setupTime: '~2 phút',
    brand: SKINS_INFO['grand-opening'].brand,
    screens: buildScreens('scratch-card', 'grand-opening'),
    availableSkins: ALL_SKINS_OPTIONS,
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
    durationSeconds: 6,
    difficulty: 'S',
    recommendedWinRate: '60–75%',
    completionRate: '94%',
    setupTime: '~1 phút',
    brand: SKINS_INFO.everyday.brand,
    screens: buildScreens('gift-box', 'everyday'),
    availableSkins: ALL_SKINS_OPTIONS,
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
    durationSeconds: 10,
    difficulty: 'S',
    recommendedWinRate: '85–95%',
    completionRate: '96%',
    setupTime: '~2 phút',
    brand: SKINS_INFO['grand-opening'].brand,
    screens: buildScreens('spin-wheel', 'grand-opening'),
    availableSkins: ALL_SKINS_OPTIONS,
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
    durationSeconds: 8,
    difficulty: 'S',
    recommendedWinRate: '75–85%',
    completionRate: '91%',
    setupTime: '~2 phút',
    brand: SKINS_INFO.tet.brand,
    screens: buildScreens('scratch-card', 'tet'),
    availableSkins: ALL_SKINS_OPTIONS,
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
      'Trao quà đầu năm bằng bộ 3 bao lì xì đại cát. Khách chạm mở bao lì xì để nhận mã giảm giá tại quầy.',
    playDuration: '5–8 giây',
    durationSeconds: 6,
    difficulty: 'S',
    recommendedWinRate: '70–80%',
    completionRate: '93%',
    setupTime: '~1 phút',
    brand: SKINS_INFO.tet.brand,
    screens: buildScreens('gift-box', 'tet'),
    availableSkins: ALL_SKINS_OPTIONS,
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
    durationSeconds: 10,
    difficulty: 'S',
    recommendedWinRate: '65–75%',
    completionRate: '95%',
    setupTime: '~2 phút',
    brand: SKINS_INFO.everyday.brand,
    screens: buildScreens('spin-wheel', 'everyday'),
    availableSkins: ALL_SKINS_OPTIONS,
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
    durationSeconds: 8,
    difficulty: 'S',
    recommendedWinRate: '75–85%',
    completionRate: '90%',
    setupTime: '~2 phút',
    brand: SKINS_INFO.everyday.brand,
    screens: buildScreens('scratch-card', 'everyday'),
    availableSkins: ALL_SKINS_OPTIONS,
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
      'Bộ 3 trứng vàng phú quý mừng mở cửa hàng, kèm lời chúc mừng khai trương và voucher giảm giá trực tiếp vào bill.',
    playDuration: '5–8 giây',
    durationSeconds: 6,
    difficulty: 'S',
    recommendedWinRate: '85–95%',
    completionRate: '94%',
    setupTime: '~2 phút',
    brand: SKINS_INFO['grand-opening'].brand,
    screens: buildScreens('gift-box', 'grand-opening'),
    availableSkins: ALL_SKINS_OPTIONS,
  },
];
