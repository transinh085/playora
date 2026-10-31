'use client';

import { Avatar } from '@playora/ui/components/base/avatar/avatar';
import { Chip, type ChipColor } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { IconButton } from '@playora/ui/components/base/buttons/icon-button';
import { Checkbox } from '@playora/ui/components/base/checkbox/checkbox';
import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerTrigger,
} from '@playora/ui/components/base/drawer/drawer';
import {
  Dropdown,
  DropdownDivider,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from '@playora/ui/components/base/dropdown/dropdown';
import { Input } from '@playora/ui/components/base/input/input';
import { Label } from '@playora/ui/components/base/input/label';
import {
  AlertDialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTrigger,
} from '@playora/ui/components/base/modal/modal';
import { Notification } from '@playora/ui/components/base/notification/notification';
import {
  Popover,
  PopoverHeader,
  PopoverTrigger,
} from '@playora/ui/components/base/popover/popover';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
import { Radio, RadioGroup } from '@playora/ui/components/base/radio/radio';
import { Select, SelectItem } from '@playora/ui/components/base/select/select';
import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { Slider } from '@playora/ui/components/base/slider/slider';
import { Switch } from '@playora/ui/components/base/switch/switch';
import { Tab, TabList, TabPanel, Tabs } from '@playora/ui/components/base/tabs/tabs';
import { Textarea } from '@playora/ui/components/base/textarea/textarea';
import { Toaster, toast } from '@playora/ui/components/base/toast/toast';
import { Tooltip, TooltipTrigger } from '@playora/ui/components/base/tooltip/tooltip';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Gem,
  GripVertical,
  HelpCircle,
  House,
  ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  ListOrdered,
  Moon,
  MoreHorizontal,
  Palette,
  PanelLeft,
  PauseCircle,
  Play,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Settings,
  Share,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tags,
  TicketCheck,
  Trash2,
  Upload,
} from '@playora/ui/icons';
import { useCallback, useEffect, useState } from 'react';
import { previewState, StateMatrix } from './state-matrix';

const SIDEBAR_DEMO_ROWS: Array<{
  id: number;
  name: string;
  gradient: string;
  status: 'live' | 'scheduled' | 'draft' | 'paused';
  template: string;
  skin: string;
  tone: ChipColor;
  skinTone: ChipColor;
  period: string;
  redeemed: string;
  rate: string;
}> = [
  {
    id: 0,
    name: 'Lộc Xuân Trà Sữa Hà 2027',
    gradient: 'from-emerald-400 to-cyan-500',
    status: 'live',
    template: 'Vòng quay',
    skin: 'Skin Tết',
    tone: 'orange',
    skinTone: 'rose',
    period: '14th Feb, 2027',
    redeemed: '276 khách',
    rate: '92.4%',
  },
  {
    id: 1,
    name: 'Cào Thẻ Ô Long Kem Phô Mai',
    gradient: 'from-rose-400 to-red-500',
    status: 'live',
    template: 'Thẻ cào',
    skin: 'Ban ngày',
    tone: 'cyan',
    skinTone: 'blue',
    period: '18th Feb, 2027',
    redeemed: '142 khách',
    rate: '88.1%',
  },
  {
    id: 2,
    name: 'Mở Hộp Quà Thứ 3 – Thứ 5',
    gradient: 'from-amber-400 to-orange-500',
    status: 'scheduled',
    template: 'Mở hộp',
    skin: 'Lấp ngày vắng',
    tone: 'blue',
    skinTone: 'cyan',
    period: '22nd Feb, 2027',
    redeemed: 'Mở 02/02',
    rate: '79.5%',
  },
  {
    id: 3,
    name: 'Apex Consulting (Tri Ân Doanh Nghiệp)',
    gradient: 'from-cyan-400 to-blue-500',
    status: 'live',
    template: 'Vòng quay',
    skin: 'Khách VIP',
    tone: 'cyan',
    skinTone: 'purple',
    period: '25th Feb, 2027',
    redeemed: '$182,450',
    rate: '92.0%',
  },
  {
    id: 4,
    name: 'Khai Trương Cơ Sở Thảo Điền',
    gradient: 'from-fuchsia-400 to-purple-500',
    status: 'draft',
    template: 'Vòng quay',
    skin: 'Khai trương',
    tone: 'purple',
    skinTone: 'rose',
    period: '28th Feb, 2027',
    redeemed: 'Nháp',
    rate: '74.2%',
  },
  {
    id: 5,
    name: 'Săn Ly Giữ Nhiệt Phiên Bản Giới Hạn',
    gradient: 'from-cyan-400 to-blue-500',
    status: 'paused',
    template: 'Thẻ cào',
    skin: 'Quà VIP',
    tone: 'rose',
    skinTone: 'purple',
    period: '03rd Mar, 2027',
    redeemed: '64 khách',
    rate: '81.6%',
  },
  {
    id: 6,
    name: 'Đêm Nhạc Acoustic Cuối Tuần',
    gradient: 'from-emerald-400 to-cyan-500',
    status: 'draft',
    template: 'Mở hộp',
    skin: 'Gala YEP',
    tone: 'rose',
    skinTone: 'blue',
    period: '08th Mar, 2027',
    redeemed: 'Nháp',
    rate: '76.8%',
  },
  {
    id: 7,
    name: 'Combo Trà Trái Cây Giờ Trưa',
    gradient: 'from-rose-400 to-red-500',
    status: 'live',
    template: 'Vòng quay',
    skin: 'Khung giờ vàng',
    tone: 'blue',
    skinTone: 'orange',
    period: '12th Mar, 2027',
    redeemed: '198 khách',
    rate: '90.3%',
  },
];

interface DrawerAccountDetail {
  id: number;
  company: string;
  legalName: string;
  email: string;
  website: string;
  location: string;
  founded: string;
  founder: string;
  employees: string;
  amount: string;
  gradient: string;
  tags: string[];
  metrics: Array<{
    label: string;
    value: string;
    badge: string;
    badgeColor: ChipColor;
    desc: string;
  }>;
}

const DRAWER_ACCOUNTS_DATA: Record<number, DrawerAccountDetail> = {
  0: {
    id: 0,
    company: 'Lộc Xuân Trà Sữa Hà 2027',
    legalName: 'Trà Sữa Hà F&B Group, Inc',
    email: 'ha@trasuaha.vn',
    website: 'trasuaha.vn',
    location: 'Quận 1, TP. Hồ Chí Minh, VN',
    founded: 'Tháng 4, 2021',
    founder: 'Chị Hà (Vũ Thu Hà)',
    employees: '25-50',
    amount: '45.000.000 ₫',
    gradient: 'from-emerald-400 to-cyan-500',
    tags: ['Vòng quay', 'Skin Tết', 'F&B'],
    metrics: [
      {
        label: 'Tỉ lệ khách tới quầy',
        value: '92.4%',
        badge: 'Xuất sắc',
        badgeColor: 'lime',
        desc: 'Tỉ lệ khách trúng voucher đã trực tiếp mang mã tới quầy đổi đồ uống.',
      },
      {
        label: 'Khách quay lại',
        value: '184',
        badge: 'Cao',
        badgeColor: 'cyan',
        desc: 'Số lượt khách thân thiết quay lại quán từ lần thứ 2 trở lên trong tháng.',
      },
      {
        label: 'Chi phí mỗi khách',
        value: '6.400 ₫',
        badge: 'Tối ưu',
        badgeColor: 'lime',
        desc: 'Chi phí quà thực tế chia cho mỗi khách tới quầy (ngân sách 2.5 triệu).',
      },
      {
        label: 'Độ hài lòng (CSAT)',
        value: '96%',
        badge: 'Xuất sắc',
        badgeColor: 'lime',
        desc: 'Đánh giá tích cực khi nhận quà ngay tại quầy thu ngân trong 3 giây.',
      },
    ],
  },
  1: {
    id: 1,
    company: 'Cào Thẻ Ô Long Kem Phô Mai',
    legalName: 'Ô Long Tea Co, Ltd',
    email: 'contact@olongtea.com',
    website: 'olongtea.com',
    location: 'Quận Cầu Giấy, Hà Nội, VN',
    founded: 'Tháng 9, 2022',
    founder: 'Anh Tuấn',
    employees: '10-20',
    amount: '28.000.000 ₫',
    gradient: 'from-rose-400 to-red-500',
    tags: ['Thẻ cào', 'Ban ngày', 'Đồ uống'],
    metrics: [
      {
        label: 'Tỉ lệ đổi quà',
        value: '88.1%',
        badge: 'Tốt',
        badgeColor: 'lime',
        desc: 'Khách cào trúng và đổi trực tiếp tại quầy trong ngày.',
      },
      {
        label: 'Khách mới',
        value: '96',
        badge: 'Cao',
        badgeColor: 'cyan',
        desc: 'Số khách lần đầu ghé quán qua mã QR tại bàn.',
      },
      {
        label: 'Chi phí mỗi khách',
        value: '7.800 ₫',
        badge: 'Hợp lý',
        badgeColor: 'cyan',
        desc: 'Chi phí quà trung bình trên mỗi khách hàng mới.',
      },
      {
        label: 'Độ hài lòng (CSAT)',
        value: '92%',
        badge: 'Tốt',
        badgeColor: 'lime',
        desc: 'Phản hồi tích cực về tốc độ đổi quà 3 giây.',
      },
    ],
  },
  2: {
    id: 2,
    company: 'Mở Hộp Quà Thứ 3 – Thứ 5',
    legalName: 'Midweek Boost Coffee, Inc',
    email: 'hello@midweekcoffee.vn',
    website: 'midweekcoffee.vn',
    location: 'Quận Bình Thạnh, TP. HCM',
    founded: 'Tháng 1, 2023',
    founder: 'Chị Mai',
    employees: '15-30',
    amount: '32.500.000 ₫',
    gradient: 'from-amber-400 to-orange-500',
    tags: ['Mở hộp', 'Lấp ngày vắng', 'Cà phê'],
    metrics: [
      {
        label: 'Lấp chỗ trống',
        value: '79.5%',
        badge: 'Khá',
        badgeColor: 'yellow',
        desc: 'Tỉ lệ tăng trưởng lượng khách giờ vắng thứ 3 và thứ 5.',
      },
      {
        label: 'Khách quay lại',
        value: '112',
        badge: 'Khá',
        badgeColor: 'cyan',
        desc: 'Khách đặt bàn hoặc tới quầy vào khung giờ khuyến mãi.',
      },
      {
        label: 'Chi phí quà',
        value: '1.450.000 ₫',
        badge: 'Kiểm soát',
        badgeColor: 'lime',
        desc: 'Tổng chi phí quà đã phát ra trong tuần.',
      },
      {
        label: 'Độ hài lòng',
        value: '89%',
        badge: 'Tốt',
        badgeColor: 'lime',
        desc: 'Khách hàng hài lòng với bất ngờ khi mở hộp quà.',
      },
    ],
  },
  3: {
    id: 3,
    company: 'Apex Consulting',
    legalName: 'Apex Consulting, Inc',
    email: 'contact@apexconsulting.co',
    website: 'apexconsulting.co',
    location: 'Austin, Texas, USA',
    founded: 'March 2013',
    founder: 'James Karen Lee',
    employees: '50-100',
    amount: '$182,450.00',
    gradient: 'from-cyan-400 to-blue-500',
    tags: ['FinTech', 'B2B SaaS', 'Enterprise'],
    metrics: [
      {
        label: 'Response Rate',
        value: '92%',
        badge: 'Very Good',
        badgeColor: 'lime',
        desc: 'Response rate indicates the percentage of recipients who respond to emails or surveys.',
      },
      {
        label: 'Email Exchange Rate',
        value: '1,198',
        badge: 'High',
        badgeColor: 'cyan',
        desc: 'Email exchange rate reflects the percentage of emails that result in meaningful interactions.',
      },
      {
        label: 'Net Promoter Score',
        value: '75',
        badge: 'High',
        badgeColor: 'cyan',
        desc: 'Net Promoter Score gauges customer loyalty by asking how likely they are to recommend the service or product to others.',
      },
      {
        label: 'Customer Satisfaction',
        value: '94%',
        badge: 'Very Good',
        badgeColor: 'lime',
        desc: 'Quarterly CSAT score evaluated from customer feedback surveys across all active accounts.',
      },
    ],
  },
};

const DRAWER_NOTES = [
  {
    id: 1,
    title: 'Contract Renewal Terms',
    date: 'Jul 22, 2026',
    author: 'By Robert Clark',
    content:
      'Discussed 2-year multi-license extension. Procurement requested updated volume pricing tiers for an additional 150 enterprise seat licenses.',
  },
  {
    id: 2,
    title: 'Product Feature Request',
    date: 'Aug 09, 2026',
    author: 'By Mary Lewis',
    content:
      'VP of Operations requested webhook triggers for automated invoice generation upon transaction milestones. Logged as ticket P-4820 in backlog.',
  },
  {
    id: 3,
    title: 'Enterprise Security Compliance Review',
    date: 'Aug 15, 2026',
    author: 'By Alex Davis',
    content:
      'Completed SOC2 Type II compliance audit review with Infosec officer. Provided data residency attestation documents for EU/APAC data stores.',
  },
];

const DRAWER_FILES_2026 = [
  { name: 'Master_Service_Agreement_2026.pdf', size: '2.4 MB', date: 'Jul 22, 2026' },
  { name: 'Enterprise_Security_Whitepaper.pdf', size: '4.8 MB', date: 'Aug 15, 2026' },
  { name: 'Architecture_Blueprint_v3.pdf', size: '8.1 MB', date: 'Aug 28, 2026' },
  { name: 'SOC2_Type_II_Attestation.pdf', size: '1.9 MB', date: 'Sep 05, 2026' },
];

const DRAWER_FILES_2025 = [
  { name: 'Annual_Audit_Report_2025.pdf', size: '3.2 MB', date: 'Dec 18, 2025' },
  { name: 'Pilot_Campaign_Review.pptx', size: '12.4 MB', date: 'Nov 04, 2025' },
];

const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;

const BUTTON_STATES = ['default', 'hover', 'focus', 'active', 'disabled'] as const;

export function StudioPreview() {
  const [winRate, setWinRate] = useState(25);
  const [requireConsent, setRequireConsent] = useState(true);
  const [antiFraud, setAntiFraud] = useState('standard');
  const [activeNavKey, setActiveNavKey] = useState('campaigns');
  const [demoSidebarCollapsed, setDemoSidebarCollapsed] = useState(false);
  const [demoClosedGroups, setDemoClosedGroups] = useState<Record<string, boolean>>({});
  const [demoFilterStatus, setDemoFilterStatus] = useState<'all' | 'live' | 'draft'>('all');
  const [demoDensity, setDemoDensity] = useState<'compact' | 'default' | 'comfortable'>('default');
  const [demoSortKey, setDemoSortKey] = useState<'name' | 'template' | 'period' | 'rate' | null>(
    null,
  );
  const [demoSortDir, setDemoSortDir] = useState<'asc' | 'desc'>('asc');
  const [demoViewDirty, setDemoViewDirty] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerId, setActiveDrawerId] = useState<number>(3);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'details' | 'notes' | 'files'>('details');

  const openDrawer = useCallback((id: number) => {
    setActiveDrawerId(id);
    setDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { openDrawer: (id: number) => void }).openDrawer = (id: number) => {
        openDrawer(id);
      };
      (window as unknown as { closeDrawer: () => void }).closeDrawer = () => {
        setDrawerOpen(false);
      };
    }
  }, [openDrawer]);

  const selectedAccount = DRAWER_ACCOUNTS_DATA[activeDrawerId] ?? DRAWER_ACCOUNTS_DATA[3];

  const toggleDemoGroup = (groupKey: string) => {
    setDemoClosedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleDemoSort = (key: 'name' | 'template' | 'period' | 'rate') => {
    setDemoViewDirty(true);
    if (demoSortKey !== key) {
      setDemoSortKey(key);
      setDemoSortDir('asc');
    } else if (demoSortDir === 'asc') {
      setDemoSortDir('desc');
    } else {
      setDemoSortKey(null);
      setDemoSortDir('asc');
    }
  };

  const demoRows = [...SIDEBAR_DEMO_ROWS]
    .filter((row) => demoFilterStatus === 'all' || row.status === demoFilterStatus)
    .sort((a, b) => {
      if (!demoSortKey) return 0;
      const mul = demoSortDir === 'asc' ? 1 : -1;
      if (demoSortKey === 'name') return a.name.localeCompare(b.name) * mul;
      if (demoSortKey === 'template') return a.template.localeCompare(b.template) * mul;
      if (demoSortKey === 'period') return a.period.localeCompare(b.period) * mul;
      return (Number.parseFloat(a.rate) - Number.parseFloat(b.rate)) * mul;
    });

  const demoRowHeightClass =
    demoDensity === 'compact'
      ? 'h-[36px]'
      : demoDensity === 'comfortable'
        ? 'h-[56px]'
        : 'h-[44px]';

  return (
    <div className="grid gap-10">
      <Toaster />

      {/* 0. Workspace Shell, Resizable Sidebar & Data Grid */}
      <div className="grid gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            0. Khung làm việc Studio, Sidebar &amp; Bảng dữ liệu (BoardUI Style)
          </h3>
          <p className="text-xs text-muted-foreground">
            Sidebar <code className="font-mono">w-[224px]</code> (thu gọn{' '}
            <code className="font-mono">w-[60px]</code>) nền{' '}
            <code className="font-mono">bg-background-secondary-default</code> với bóng{' '}
            <code className="font-mono">shadow-sidebar</code>; mục đang chọn dùng{' '}
            <code className="font-mono">
              bg-linear-to-b from-accent-500 to-accent-600 text-white shadow-nav-selected
            </code>
            ; các nhóm điều hướng thu/mở; chân Sidebar hiển thị hồ sơ tài khoản và chuyển đổi giao
            diện; bảng dữ liệu sát mép thẻ chuẩn BoardUI.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-separator-border bg-background-full p-3 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Left Sidebar */}
            <div
              style={{ width: demoSidebarCollapsed ? 60 : 224 }}
              className="relative flex shrink-0 flex-col justify-between rounded-3xl border border-border-button-white bg-background-secondary-default p-3 shadow-sidebar transition-[width] duration-300 ease-in-out select-none"
            >
              {/* Workspace Top Bar */}
              <div
                className={`flex w-full items-center transition-[gap] duration-300 ease-in-out ${
                  demoSidebarCollapsed
                    ? 'flex-col-reverse items-center justify-center gap-2.5'
                    : 'flex-row items-center justify-between'
                }`}
              >
                <div
                  className={`flex cursor-pointer items-center gap-2 rounded-xl text-text-secondary transition-colors hover:bg-background-secondary-hover hover:text-text-primary ${
                    demoSidebarCollapsed ? 'size-9 justify-center p-0' : 'min-w-0 flex-1 p-1.5'
                  }`}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-tr from-emerald-400 to-cyan-500 font-bold text-caption-1-semibold text-white shadow-xs">
                    H
                  </div>
                  {!demoSidebarCollapsed && (
                    <span className="truncate text-body-medium font-medium text-text-primary animate-crm-fade-in">
                      Trà Sữa Hà
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDemoSidebarCollapsed((prev) => !prev)}
                  aria-label={
                    demoSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'
                  }
                  className={`cursor-pointer text-foreground-icon-secondary transition-colors hover:text-foreground-icon-primary ${
                    demoSidebarCollapsed ? 'flex size-9 items-center justify-center' : 'p-1'
                  }`}
                >
                  <PanelLeft className="size-4" />
                </button>
              </div>

              {/* Navigation Items Container */}
              <div className="flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto pt-3 pb-2">
                {/* Primary Navigation */}
                <div className="flex w-full flex-col gap-1">
                  {[
                    { key: 'home', label: 'Trang chủ', Icon: House },
                    { key: 'redeem', label: 'Đổi quà', Icon: TicketCheck },
                    { key: 'search', label: 'Thao tác nhanh', Icon: Search },
                  ].map(({ key, label, Icon }) => {
                    const active = activeNavKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveNavKey(key)}
                        className={`flex cursor-pointer items-center gap-2 rounded-2lg p-2 transition-[width,background-color] duration-300 ease-in-out ${
                          demoSidebarCollapsed ? 'size-9 justify-center' : 'w-full text-left'
                        } ${
                          active
                            ? 'bg-linear-to-b from-accent-500 to-accent-600 font-medium text-white shadow-nav-selected'
                            : 'text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary'
                        }`}
                      >
                        <Icon
                          className={`size-5 shrink-0 ${active ? 'text-white' : 'text-foreground-icon-secondary'}`}
                        />
                        {!demoSidebarCollapsed && (
                          <span className="truncate text-body-medium animate-crm-fade-in">
                            {label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Minigame Accordion Section */}
                <div className="flex w-full flex-col gap-1">
                  {!demoSidebarCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleDemoGroup('minigames')}
                      className="group flex w-full cursor-pointer items-center justify-between px-2 pt-2 pb-1 text-left"
                    >
                      <span className="text-caption-1-semibold text-text-tertiary transition-colors group-hover:text-text-secondary">
                        Minigame
                      </span>
                      <ChevronDown
                        className={`size-3.5 text-text-tertiary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          demoClosedGroups.minigames ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>
                  )}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      demoClosedGroups.minigames && !demoSidebarCollapsed
                        ? 'pointer-events-none grid-rows-[0fr] opacity-0'
                        : 'grid-rows-[1fr] opacity-100'
                    }`}
                  >
                    <div className="flex w-full flex-col gap-1 overflow-hidden">
                      {[
                        { key: 'campaigns', label: 'Chương trình', Icon: CalendarDays },
                        { key: 'templates', label: 'Kho mẫu', Icon: LayoutTemplate },
                        { key: 'brandKits', label: 'Brand kit', Icon: Palette },
                        { key: 'assets', label: 'Thư viện ảnh', Icon: ImageIcon },
                      ].map(({ key, label, Icon }) => {
                        const active = activeNavKey === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setActiveNavKey(key)}
                            className={`flex cursor-pointer items-center gap-2 rounded-2lg p-2 transition-[width,background-color] duration-300 ease-in-out ${
                              demoSidebarCollapsed ? 'size-9 justify-center' : 'w-full text-left'
                            } ${
                              active
                                ? 'bg-linear-to-b from-accent-500 to-accent-600 font-medium text-white shadow-nav-selected'
                                : 'text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary'
                            }`}
                          >
                            <Icon
                              className={`size-5 shrink-0 ${active ? 'text-white' : 'text-foreground-icon-secondary'}`}
                            />
                            {!demoSidebarCollapsed && (
                              <span className="truncate text-body-medium animate-crm-fade-in">
                                {label}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Organization Accordion Section */}
                <div className="flex w-full flex-col gap-1">
                  {!demoSidebarCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleDemoGroup('organization')}
                      className="group flex w-full cursor-pointer items-center justify-between px-2 pt-2 pb-1 text-left"
                    >
                      <span className="text-caption-1-semibold text-text-tertiary transition-colors group-hover:text-text-secondary">
                        Tổ chức
                      </span>
                      <ChevronDown
                        className={`size-3.5 text-text-tertiary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          demoClosedGroups.organization ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>
                  )}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      demoClosedGroups.organization && !demoSidebarCollapsed
                        ? 'pointer-events-none grid-rows-[0fr] opacity-0'
                        : 'grid-rows-[1fr] opacity-100'
                    }`}
                  >
                    <div className="flex w-full flex-col gap-1 overflow-hidden">
                      {[
                        { key: 'settings', label: 'Cài đặt', Icon: Settings },
                        { key: 'billing', label: 'Gói & sử dụng', Icon: Gem },
                      ].map(({ key, label, Icon }) => {
                        const active = activeNavKey === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setActiveNavKey(key)}
                            className={`flex cursor-pointer items-center gap-2 rounded-2lg p-2 transition-[width,background-color] duration-300 ease-in-out ${
                              demoSidebarCollapsed ? 'size-9 justify-center' : 'w-full text-left'
                            } ${
                              active
                                ? 'bg-linear-to-b from-accent-500 to-accent-600 font-medium text-white shadow-nav-selected'
                                : 'text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary'
                            }`}
                          >
                            <Icon
                              className={`size-5 shrink-0 ${active ? 'text-white' : 'text-foreground-icon-secondary'}`}
                            />
                            {!demoSidebarCollapsed && (
                              <span className="truncate text-body-medium animate-crm-fade-in">
                                {label}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* User Profile Row */}
              <div
                className={`flex shrink-0 items-center rounded-xl bg-background-tertiary-default p-2 transition-colors ${
                  demoSidebarCollapsed ? 'size-9 justify-center' : 'w-full justify-between'
                }`}
              >
                <div
                  className={`flex cursor-pointer items-center gap-2 text-text-primary ${
                    demoSidebarCollapsed ? 'justify-center' : 'flex-1'
                  }`}
                >
                  <Avatar size="sm" initials="H" color="blue" />
                  {!demoSidebarCollapsed && (
                    <span className="truncate text-body-medium font-medium animate-crm-fade-in">
                      Chị Hà
                    </span>
                  )}
                </div>
                {!demoSidebarCollapsed && (
                  <MoreHorizontal className="size-4 shrink-0 text-foreground-icon-secondary" />
                )}
              </div>
            </div>

            {/* Right Content Pane */}
            <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-separator-border bg-background-primary-default shadow-card">
              {/* Top Header */}
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-separator-border bg-background-primary-default px-4 py-2">
                <div className="flex items-center gap-2 rounded-md px-2 py-2">
                  <CalendarDays className="h-4 w-4 text-neutral-500 dark:text-[#A3A3A3]" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-[#FAFAFA]">
                    Chương trình
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-neutral-600 transition-all duration-150 hover:bg-neutral-100 hover:text-neutral-900 active:scale-[0.97] dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden text-sm font-normal sm:block">Chương trình</span>
                  </button>
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-neutral-600 transition-all duration-150 hover:bg-neutral-100 hover:text-neutral-900 active:scale-[0.97] dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
                  >
                    <Share className="h-4 w-4" />
                    <span className="hidden text-sm font-normal sm:block">Share</span>
                  </button>
                  <div className="mx-1 h-[18px] w-[0.5px] bg-neutral-200 dark:bg-white/10" />
                  <div className="mr-2 flex items-center">
                    <div className="z-30 -mr-1.5 h-4 w-4 rounded-full border border-white bg-gradient-to-r from-blue-400 to-blue-600 dark:border-[#0A0A0A]" />
                    <div className="z-20 -mr-1.5 h-4 w-4 rounded-full border border-white bg-gradient-to-r from-yellow-400 to-orange-500 dark:border-[#0A0A0A]" />
                    <div className="z-10 h-4 w-4 rounded-full border border-white bg-gradient-to-r from-green-400 to-teal-500 dark:border-[#0A0A0A]" />
                  </div>
                  <div className="mx-1 h-[18px] w-[0.5px] bg-neutral-200 dark:bg-white/10" />
                  <button
                    type="button"
                    aria-label="Theme"
                    className="relative flex h-8 w-8 items-center justify-center rounded-md p-2 text-neutral-500 transition-all duration-150 hover:bg-neutral-100 active:scale-95 dark:text-[#737373] dark:hover:bg-white/5"
                  >
                    <Sun className="theme-icon icon-sun h-4 w-4" />
                    <Moon className="theme-icon icon-moon h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Help"
                    className="flex h-8 w-8 items-center justify-center rounded-md p-2 text-neutral-500 transition-all duration-150 hover:bg-neutral-100 active:scale-95 dark:text-[#737373] dark:hover:bg-white/5"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Secondary Toolbar & Filter Controls */}
              <div className="flex h-[48px] shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white p-2 dark:border-white/10 dark:bg-[#0A0A0A]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDemoFilterStatus('all');
                      setDemoViewDirty(true);
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-neutral-600 transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] dark:text-[#A3A3A3] dark:hover:bg-white/5"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="text-sm font-normal">
                      Filter (
                      <span className="tabular-nums">{demoFilterStatus === 'all' ? 0 : 1}</span>)
                    </span>
                  </button>
                  {(
                    [
                      { key: 'all', label: 'Tất cả', count: SIDEBAR_DEMO_ROWS.length },
                      {
                        key: 'live',
                        label: 'Đang chạy',
                        count: SIDEBAR_DEMO_ROWS.filter((r) => r.status === 'live').length,
                      },
                      {
                        key: 'draft',
                        label: 'Nháp',
                        count: SIDEBAR_DEMO_ROWS.filter((r) => r.status === 'draft').length,
                      },
                    ] as const
                  ).map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => {
                        setDemoFilterStatus(chip.key);
                        setDemoViewDirty(true);
                      }}
                      className={`flex h-8 animate-crm-chip-in cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] ${
                        demoFilterStatus === chip.key
                          ? 'border-neutral-200 bg-neutral-100 font-medium text-neutral-900 dark:border-white/10 dark:bg-white/10 dark:text-[#FAFAFA]'
                          : 'border-transparent font-normal text-neutral-500 hover:bg-neutral-100 dark:text-[#737373] dark:hover:bg-white/5'
                      }`}
                    >
                      <span>{chip.label}</span>
                      <span className="text-xs opacity-70 tabular-nums">{chip.count}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Add filter"
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md p-2 text-neutral-500 transition-all duration-150 hover:bg-neutral-100 active:scale-95 dark:text-[#737373] dark:hover:bg-white/5"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDrawer(3)}
                    className="hidden h-8 cursor-pointer items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 text-[13px] font-medium text-blue-600 transition-all hover:bg-blue-500/20 active:scale-95 sm:flex dark:text-blue-400"
                    title="Kích hoạt trigger openDrawer(3)"
                  >
                    <PanelLeft className="h-3.5 w-3.5 -scale-x-100" />
                    <span>openDrawer(3)</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Dropdown>
                    <DropdownTrigger className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-neutral-600 transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] dark:text-[#A3A3A3] dark:hover:bg-white/5">
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden text-sm font-normal sm:block">Layout</span>
                    </DropdownTrigger>
                    <DropdownPopover aria-label="Layout" placement="bottom end" className="w-44">
                      {(
                        [
                          { key: 'compact', label: 'Compact (36px)' },
                          { key: 'default', label: 'Default (44px)' },
                          { key: 'comfortable', label: 'Comfortable (56px)' },
                        ] as const
                      ).map((item) => (
                        <DropdownItem
                          key={item.key}
                          selected={demoDensity === item.key}
                          onSelect={() => {
                            setDemoDensity(item.key);
                            setDemoViewDirty(true);
                          }}
                          className="justify-between"
                        >
                          <span>{item.label}</span>
                          {demoDensity === item.key && (
                            <Check className="h-3.5 w-3.5 text-blue-500" />
                          )}
                        </DropdownItem>
                      ))}
                    </DropdownPopover>
                  </Dropdown>

                  <Dropdown>
                    <DropdownTrigger
                      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] dark:hover:bg-white/5 ${
                        demoSortKey
                          ? 'bg-neutral-100 font-medium text-neutral-900 dark:bg-white/10 dark:text-[#FAFAFA]'
                          : 'text-neutral-600 dark:text-[#A3A3A3]'
                      }`}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                      <span className="hidden text-sm font-normal sm:block">
                        Sort{demoSortKey ? ' (1)' : ''}
                      </span>
                    </DropdownTrigger>
                    <DropdownPopover aria-label="Sort" placement="bottom end" className="w-44">
                      {(
                        [
                          { key: 'name', label: 'Chương trình' },
                          { key: 'template', label: 'Categories' },
                          { key: 'period', label: 'Start Date' },
                          { key: 'rate', label: 'Response Rate' },
                        ] as const
                      ).map((item) => (
                        <DropdownItem
                          key={item.key}
                          selected={demoSortKey === item.key}
                          onSelect={() => toggleDemoSort(item.key)}
                          className="justify-between"
                        >
                          <span>{item.label}</span>
                          {demoSortKey === item.key && (
                            <ArrowUp
                              className={`h-3.5 w-3.5 text-blue-500 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                demoSortDir === 'desc' ? 'rotate-180' : ''
                              }`}
                            />
                          )}
                        </DropdownItem>
                      ))}
                    </DropdownPopover>
                  </Dropdown>

                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-neutral-600 transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] dark:text-[#A3A3A3] dark:hover:bg-white/5"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden text-sm font-normal lg:block">View Settings</span>
                  </button>
                  <div className="mx-1 hidden h-[18px] w-[0.5px] bg-neutral-200 sm:block dark:bg-white/10" />
                  <button
                    type="button"
                    aria-label="Save view"
                    onClick={() => setDemoViewDirty(false)}
                    className="relative hidden h-8 w-8 cursor-pointer items-center justify-center rounded-md p-2 text-neutral-500 transition-all duration-150 hover:bg-neutral-100 active:scale-95 sm:flex dark:text-[#737373] dark:hover:bg-white/5"
                  >
                    <Save className="h-4 w-4" />
                    <span
                      className={`absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        demoViewDirty ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Grid Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-[#0A0A0A]">
                    <tr>
                      <th className="relative h-[44px] w-[52px] border-r border-neutral-200 px-2 text-center font-medium text-neutral-500 dark:border-white/10 dark:text-[#737373]">
                        #
                      </th>
                      <th className="relative h-[44px] border-r border-neutral-200 px-3 font-normal text-neutral-900 dark:border-white/10 dark:text-[#FAFAFA]">
                        <button
                          type="button"
                          onClick={() => toggleDemoSort('name')}
                          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
                        >
                          <Building2 className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                          <span>Chương trình</span>
                        </button>
                      </th>
                      <th className="relative h-[44px] border-r border-neutral-200 px-3 font-normal text-neutral-900 dark:border-white/10 dark:text-[#FAFAFA]">
                        <button
                          type="button"
                          onClick={() => toggleDemoSort('template')}
                          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
                        >
                          <Tags className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                          <span>Categories</span>
                        </button>
                      </th>
                      <th className="relative h-[44px] border-r border-neutral-200 px-3 font-normal text-neutral-900 dark:border-white/10 dark:text-[#FAFAFA]">
                        <button
                          type="button"
                          onClick={() => toggleDemoSort('period')}
                          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
                        >
                          <Calendar className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                          <span>Start Date</span>
                        </button>
                      </th>
                      <th className="relative h-[44px] border-r border-neutral-200 px-3 font-normal text-neutral-900 dark:border-white/10 dark:text-[#FAFAFA]">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                          <span>Kết quả</span>
                        </div>
                      </th>
                      <th className="h-[44px] px-3 font-normal text-neutral-900 dark:text-[#FAFAFA]">
                        <button
                          type="button"
                          onClick={() => toggleDemoSort('rate')}
                          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
                        >
                          <Activity className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                          <span>Response Rate</span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-white/10">
                    {demoRows.map((row, idx) => {
                      const rowId = row.id ?? idx;
                      const isRowActive = drawerOpen && activeDrawerId === rowId;
                      return (
                        <tr
                          key={row.name}
                          onClick={() => openDrawer(rowId)}
                          className={`group cursor-pointer transition-colors ${
                            isRowActive
                              ? 'bg-neutral-100 ring-1 ring-neutral-300 dark:bg-white/10 dark:ring-white/20'
                              : 'bg-white hover:bg-neutral-50 dark:bg-[#0A0A0A] dark:hover:bg-white/5'
                          } ${demoRowHeightClass}`}
                        >
                          <td className="border-r border-neutral-200 px-2 text-center dark:border-white/10">
                            <div className="flex items-center justify-center">
                              <span className="text-sm font-normal text-neutral-500 tabular-nums group-hover:hidden dark:text-[#A3A3A3]">
                                {idx + 1}
                              </span>
                              <span className="hidden items-center justify-center rounded p-1 text-neutral-400 group-hover:flex dark:text-[#737373]">
                                <GripVertical className="h-4 w-4" />
                              </span>
                            </div>
                          </td>
                          <td className="border-r border-neutral-200 px-3 dark:border-white/10">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-4 w-4 shrink-0 rounded-md bg-gradient-to-tr ${row.gradient} shadow-2xs`}
                              />
                              <span className="truncate text-sm font-medium text-neutral-900 dark:text-[#FAFAFA]">
                                {row.name}
                              </span>
                            </div>
                          </td>
                          <td className="border-r border-neutral-200 px-3 dark:border-white/10">
                            <div className="flex items-center gap-1.5">
                              <Chip variant="caption" color={row.tone}>
                                {row.template}
                              </Chip>
                              <Chip variant="caption" color={row.skinTone}>
                                {row.skin}
                              </Chip>
                            </div>
                          </td>
                          <td className="border-r border-neutral-200 px-3 text-sm font-normal text-neutral-600 dark:border-white/10 dark:text-[#A3A3A3]">
                            {row.period}
                          </td>
                          <td className="border-r border-neutral-200 px-3 text-sm font-medium text-neutral-900 tabular-nums dark:border-white/10 dark:text-[#FAFAFA]">
                            {row.redeemed}
                          </td>
                          <td className="px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-normal text-neutral-900 tabular-nums dark:text-[#FAFAFA]">
                                {row.rate}
                              </span>
                              <Chip
                                variant="caption"
                                color={
                                  Number.parseFloat(row.rate) >= 90
                                    ? 'lime'
                                    : Number.parseFloat(row.rate) >= 80
                                      ? 'blue'
                                      : 'yellow'
                                }
                              >
                                {Number.parseFloat(row.rate) >= 90
                                  ? 'Excellent'
                                  : Number.parseFloat(row.rate) >= 80
                                    ? 'Good'
                                    : 'Average'}
                              </Chip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-neutral-200 bg-neutral-100 dark:border-white/10 dark:bg-[#171717]">
                    <tr className="h-[44px]">
                      <td className="border-r border-neutral-200 px-2 text-center text-sm font-normal text-neutral-500 dark:border-white/10 dark:text-[#A3A3A3]">
                        -
                      </td>
                      <td className="border-r border-neutral-200 px-3 dark:border-white/10">
                        <div className="flex items-center gap-2 text-sm font-normal text-neutral-500 tabular-nums dark:text-[#A3A3A3]">
                          <ListOrdered className="h-4 w-4 shrink-0" />
                          <span>Total: {demoRows.length}</span>
                        </div>
                      </td>
                      <td className="border-r border-neutral-200 px-3 dark:border-white/10">
                        <div className="flex items-center gap-2 text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                          <ListOrdered className="h-4 w-4 shrink-0" />
                          <span>Count</span>
                        </div>
                      </td>
                      <td className="border-r border-neutral-200 px-3 dark:border-white/10">
                        <div className="flex items-center gap-2 text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                          <ListOrdered className="h-4 w-4 shrink-0" />
                          <span>Count</span>
                        </div>
                      </td>
                      <td className="border-r border-neutral-200 px-3 dark:border-white/10">
                        <div className="flex items-center gap-2 text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                          <ListOrdered className="h-4 w-4 shrink-0" />
                          <span>Count</span>
                        </div>
                      </td>
                      <td className="px-3">
                        <div className="flex items-center gap-2 text-sm font-normal text-neutral-500 dark:text-[#A3A3A3]">
                          <ListOrdered className="h-4 w-4 shrink-0" />
                          <span>Count</span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Side Drawer Component (BoardUI Drawer) */}
        <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen} placement="end" size="lg">
          <DrawerHeader
            title={selectedAccount?.company ?? 'Apex Consulting'}
            description={`${selectedAccount?.legalName ?? 'Apex Consulting, Inc'} • ${selectedAccount?.amount ?? '$182,450.00'}`}
          />
          <DrawerBody>
            <Tabs
              selectedKey={activeDrawerTab}
              onSelectionChange={(key) => setActiveDrawerTab(key as 'details' | 'notes' | 'files')}
            >
              <TabList aria-label="Thông tin chi tiết">
                <Tab id="details">Chi tiết</Tab>
                <Tab id="notes" count={DRAWER_NOTES.length}>
                  Ghi chú
                </Tab>
                <Tab id="files" count={DRAWER_FILES_2026.length + DRAWER_FILES_2025.length}>
                  Tài liệu
                </Tab>
              </TabList>

              <TabPanel id="details" className="grid gap-4 pt-3">
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-text-secondary">Email</span>
                    <a
                      href={`mailto:${selectedAccount?.email ?? 'contact@apexconsulting.co'}`}
                      className="text-blue-500 hover:underline"
                    >
                      {selectedAccount?.email ?? 'contact@apexconsulting.co'}
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-text-secondary">Website</span>
                    <a
                      href={`https://${selectedAccount?.website ?? 'apexconsulting.co'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                    >
                      <span>{selectedAccount?.website ?? 'apexconsulting.co'}</span>
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-text-secondary">Địa điểm</span>
                    <span className="text-text-primary">{selectedAccount?.location}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-text-secondary">Thành lập</span>
                    <span className="text-text-primary">{selectedAccount?.founded}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-text-secondary">Đại diện</span>
                    <span className="text-text-primary">{selectedAccount?.founder}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedAccount?.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-text-secondary">{m.label}</span>
                        <Chip variant="caption" color={m.badgeColor}>
                          {m.badge}
                        </Chip>
                      </div>
                      <div className="mt-1 text-xl font-bold text-text-primary">{m.value}</div>
                      <p className="mt-1 text-xs text-text-secondary">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </TabPanel>

              <TabPanel id="notes" className="grid gap-3 pt-3">
                {DRAWER_NOTES.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-text-primary">{n.title}</span>
                      <span className="text-xs text-text-tertiary">{n.date}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-text-secondary">{n.content}</p>
                    <div className="mt-2 text-[11px] text-text-tertiary">{n.author}</div>
                  </div>
                ))}
              </TabPanel>

              <TabPanel id="files" className="grid gap-3 pt-3">
                {[...DRAWER_FILES_2026, ...DRAWER_FILES_2025].map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="size-4 shrink-0 text-text-secondary" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-text-primary">
                          {f.name}
                        </div>
                        <div className="text-[11px] text-text-tertiary">
                          {f.size} · {f.date}
                        </div>
                      </div>
                    </div>
                    <IconButton
                      icon={Download}
                      size="small"
                      aria-label={`Tải ${f.name}`}
                      onClick={() => toast.success(`Đang tải: ${f.name}`)}
                    />
                  </div>
                ))}
              </TabPanel>
            </Tabs>
          </DrawerBody>
        </Drawer>
      </div>

      {/* 1. Button State Matrix & Sizes */}
      <div className="grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              1. Nút hành động (Button · BoardUI Primitive)
            </h3>
            <p className="text-xs text-muted-foreground">
              Hệ nút chuẩn BoardUI: 4 biến thể (primary, secondary, ghost, danger) và 3 kích cỡ
              (medium, small, xs).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">Cỡ xs (24px)</Button>
            <Button size="small">Cỡ small (32px)</Button>
            <Button size="medium" leadingIcon={Plus}>
              Mặc định (36px)
            </Button>
            <TooltipTrigger>
              <IconButton icon={Play} aria-label="Chơi thử" />
              <Tooltip>Chơi thử bản nháp (không trừ kho thật)</Tooltip>
            </TooltipTrigger>
          </div>
        </div>

        <StateMatrix
          rows={BUTTON_VARIANTS}
          states={BUTTON_STATES}
          render={(variant, state) => (
            <Button variant={variant} {...previewState(state)}>
              Phát hành
            </Button>
          )}
        />

        {/* Icon Buttons Showcase */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-neutral-50/50 p-3.5 dark:bg-white/[0.02]">
          <span className="text-xs font-medium text-muted-foreground">Icon Combinations:</span>
          <Button trailingIcon={ArrowRight} size="small">
            Tiếp tục
          </Button>
          <Button variant="secondary" trailingIcon={Download} size="small">
            Tải báo cáo
          </Button>
          <Button variant="danger" leadingIcon={Trash2} size="small">
            Xoá
          </Button>
          <Button variant="ghost" leadingIcon={Upload} size="small">
            Tải lên
          </Button>
        </div>
      </div>

      {/* 2. Semantic Status Chips */}
      <div className="grid gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            2. Nhãn trạng thái &amp; Vòng đời chương trình (Chip · Không bao giờ chỉ dùng màu)
          </h3>
          <p className="text-xs text-muted-foreground">
            Trạng thái chương trình do hệ thống tự suy ra (PRD §3.2) và luôn đi kèm icon hoặc chấm
            chuyển động.
          </p>
        </div>
        <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-2.5">
            <Chip variant="caption" color="neutral" className="gap-1.5">
              <Clock className="size-3 text-muted-foreground" />
              Nháp (Chưa phát hành)
            </Chip>
            <Chip variant="caption" color="cyan" className="gap-1.5">
              <Clock className="size-3" />
              Đã lên lịch · Mở 25/01
            </Chip>
            <Chip variant="caption" color="lime" className="gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2 animate-live-pulse rounded-full bg-current"
              />
              Đang chạy (On air)
            </Chip>
            <Chip variant="caption" color="yellow" className="gap-1.5">
              <PauseCircle className="size-3" />
              Tạm dừng
            </Chip>
            <Chip variant="caption" color="gray" className="gap-1.5">
              Đã kết thúc
            </Chip>
            <Chip variant="caption" color="lime" className="gap-1.5">
              <CheckCircle2 className="size-3" />
              Đã trao quà tại quầy
            </Chip>
            <Chip variant="caption" color="yellow" className="gap-1.5">
              <AlertTriangle className="size-3" />
              Quà còn 14% (&lt; 20%)
            </Chip>
            <Chip variant="caption" color="rose" className="gap-1.5">
              Đã đổi lúc 14:02 · Quán Q.1
            </Chip>
            <Chip variant="caption" color="blue" className="gap-1.5">
              <Sparkles className="size-3" />
              Playbook: Tết kéo khách
            </Chip>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Pastel Category Tags:
            </span>
            <Chip variant="caption" color="orange">
              Vòng quay · Skin Tết
            </Chip>
            <Chip variant="caption" color="cyan">
              Thẻ cào · Ban ngày
            </Chip>
            <Chip variant="caption" color="blue">
              Mở hộp · Lấp ngày vắng
            </Chip>
            <Chip variant="caption" color="lime">
              Khách quay lại lần 2
            </Chip>
            <Chip variant="caption" color="purple">
              Khai trương cơ sở
            </Chip>
            <Chip variant="caption" color="rose">
              Thiết kế Canvas
            </Chip>
            <Chip variant="caption" color="yellow">
              Khung giờ vàng
            </Chip>
          </div>
        </div>
      </div>

      {/* 3. Inputs & Validation Matrix */}
      <div className="grid gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            3. Trường nhập liệu &amp; Biểu mẫu (Inputs, Controls &amp; Validation Matrix)
          </h3>
          <p className="text-xs text-muted-foreground">
            Đồng bộ hoàn toàn với <code className="font-mono">Button</code>: cùng chiều cao chuẩn
            36px và hỗ trợ trạng thái lỗi, vô hiệu hoá qua React Aria.
          </p>
        </div>

        <StateMatrix
          rows={['input'] as const}
          states={['default', 'hover', 'focus', 'disabled', 'invalid']}
          render={(_, state) => (
            <Input
              aria-label="Tên chương trình mẫu"
              defaultValue={state === 'invalid' ? 'tet-tra-sua-ha' : 'Vòng quay Tết Trà Sữa Hà'}
              isInvalid={state === 'invalid'}
              isDisabled={state === 'disabled'}
              className="max-w-52"
            />
          )}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="grid gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
            <div>
              <h4 className="text-base font-semibold text-text-primary">
                Thiết lập Luật &amp; Giải (BLD-21 · PRZ-08 · EVT-13)
              </h4>
              <p className="mt-0.5 text-xs text-text-secondary">
                Cấu hình ngân sách, tỷ lệ trúng và mức chống gian lận cho chương trình.
              </p>
            </div>

            <Input label="Tên chương trình" defaultValue="Lộc Xuân Trà Sữa Hà 2027" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Mục tiêu (Playbook)</Label>
                <Select defaultSelectedKey="tet_traffic" aria-label="Mục tiêu (Playbook)">
                  <SelectItem id="tet_traffic">Tết: Kéo khách về quán</SelectItem>
                  <SelectItem id="second_visit">Khách quay lại lần 2</SelectItem>
                  <SelectItem id="slow_days">Lấp ngày vắng (Thứ 3–Thứ 5)</SelectItem>
                </Select>
              </div>

              <Input
                label="Đường dẫn (Trạng thái lỗi trùng)"
                defaultValue="loc-xuan-2027"
                isInvalid
                hint="Đường dẫn này đã được chương trình khác sử dụng."
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-body-medium text-text-primary">Tổng tỷ lệ trúng thưởng</span>
                <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                  {winRate}% (1 trong 4 khách trúng)
                </span>
              </div>
              <Slider
                aria-label="Tổng tỷ lệ trúng thưởng"
                value={winRate}
                onChange={setWinRate}
                maxValue={100}
                step={5}
              />
            </div>

            <div className="grid gap-2">
              <span className="text-body-medium text-text-primary">
                Mức chống gian lận (EVT-13)
              </span>
              <RadioGroup
                aria-label="Mức chống gian lận"
                value={antiFraud}
                onChange={setAntiFraud}
                className="grid gap-2 sm:grid-cols-2"
              >
                <Radio
                  value="standard"
                  className="rounded-xl border border-border/80 p-3 data-[selected]:border-primary data-[selected]:bg-primary/5"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">Chuẩn (Mặc định M1)</div>
                    <div className="text-[11px] text-muted-foreground">
                      SĐT + Thiết bị + Turnstile ẩn
                    </div>
                  </div>
                </Radio>
                <Radio
                  value="strict"
                  className="rounded-xl border border-border/80 p-3 data-[selected]:border-primary data-[selected]:bg-primary/5"
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Nghiêm ngặt (M2 OTP)
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Xác thực mã OTP qua SĐT/Zalo
                    </div>
                  </div>
                </Radio>
              </RadioGroup>
            </div>

            <Textarea
              label="Thể lệ tóm tắt hiển thị ở màn Bìa (CMP-04)"
              rows={2}
              defaultValue="Mỗi khách có 1 lượt quay mỗi ngày từ 09:00–22:00. Đổi quà trực tiếp tại quầy trong 7 ngày."
            />

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 p-3">
              <div className="grid gap-0.5">
                <span className="text-xs font-semibold text-text-primary">
                  Tách ô đồng ý nhận ưu đãi lần sau (CMP-02 / G6)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Không gộp chung với điều khoản tham gia chương trình
                </span>
              </div>
              <Switch
                aria-label="Tách ô đồng ý nhận ưu đãi lần sau"
                isSelected={requireConsent}
                onChange={setRequireConsent}
              />
            </div>

            <Checkbox defaultSelected size="sm">
              Cho phép nhân viên quầy tập huấn bằng mã chơi thử trước giờ mở bán (PRZ-19)
            </Checkbox>
          </div>

          {/* 4. Navigation, Alerts, Progress, Overlays & Feedback */}
          <div className="grid content-start gap-4">
            <div className="grid gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
              <div>
                <h4 className="text-base font-semibold text-text-primary">
                  Điều hướng 3 chế độ Builder &amp; Hạn mức gói (Tabs · Progress · Avatar)
                </h4>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Tabs gạch chân động; ProgressBar cảnh báo hạn mức 80%.
                </p>
              </div>

              <Tabs defaultSelectedKey="quick">
                <TabList aria-label="Chế độ Builder">
                  <Tab id="quick">1. Sửa nhanh</Tab>
                  <Tab id="canvas">2. Tuỳ biến (Canvas)</Tab>
                  <Tab id="rules">3. Luật &amp; giải</Tab>
                </TabList>
                <TabPanel
                  id="quick"
                  className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"
                >
                  Chế độ mặc định cho chủ quán: thay logo, ảnh sản phẩm trà sữa, câu khuyến mãi và
                  đổi skin giữ nguyên nội dung (BLD-19).
                </TabPanel>
                <TabPanel
                  id="canvas"
                  className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"
                >
                  Canvas tự do 5 màn hình: kéo thả, xoay, căn lề snap và khoá lớp (BLD-20).
                </TabPanel>
                <TabPanel
                  id="rules"
                  className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"
                >
                  4 bước cấu hình giải thưởng, câu luật tự nhiên, mô phỏng ngân sách và pháp lý
                  (BLD-21).
                </TabPanel>
              </Tabs>

              <div className="grid gap-1.5 rounded-xl border border-border/70 p-3">
                <ProgressBar
                  label="Gói Quán · Lượt đổi quà tại quầy tháng này (BIL-02)"
                  value={82}
                  description="Quầy đổi quà không bao giờ bị chặn kể cả khi vượt 100% hạn mức gói (D-23)."
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Avatar initials="TH" size="lg" color="blue" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Chị Hà · Trà Sữa Hà (3 cơ sở)
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Vai trò: Chủ quán (Owner)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-24 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="grid gap-2.5">
              <Notification
                status="error"
                dismissible={false}
                title="Còn 1 mục cần kiểm tra trước khi phát hành (BLD-08)"
                description="Quà “Mua 1 tặng 1 Ô Long” chưa có ảnh minh hoạ. Thêm ảnh giúp tỷ lệ khách đổi quà tăng 24%."
              />

              <Notification
                status="information"
                dismissible={false}
                title="Nhịp phát quà đang nhanh hơn dự kiến 18% (PRZ-22)"
                description="Dự báo hết quà sớm 3 ngày trước Mùng 5 Tết. Đề xuất giảm tỷ lệ trúng từ 30% xuống 24%."
              />

              <Notification
                status="success"
                dismissible={false}
                title="Sẵn sàng mở bán tại 3 điểm bán (BLD-29)"
                description="Đã ghép 3 máy quầy và nhân viên đã hoàn tất đổi thử mã tập huấn."
              />
            </div>

            {/* Overlays & Toast Triggers */}
            <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-card">
              <div className="mb-2.5 text-xs font-semibold text-foreground">
                Hộp thoại, Ngăn kéo, Menu &amp; Thông báo (Overlays &amp; Toast)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Modal: Pre-flight publish */}
                <ModalTrigger>
                  <Button size="small" leadingIcon={Rocket}>
                    Hộp Phát hành (Modal)
                  </Button>
                  <Modal>
                    {({ close }) => (
                      <>
                        <ModalHeader
                          title="Kiểm tra trước khi phát hành (BLD-08)"
                          description="Phiên bản phát hành là bất biến để bảo vệ quyền lợi người chơi và đối soát giải thưởng."
                        />
                        <ModalBody>
                          <div className="grid gap-2.5 py-2 text-xs">
                            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/8 p-3 text-success">
                              <CheckCircle2 className="size-4 shrink-0" />
                              <span>
                                Tổng ngân sách 400 phần quà khớp 1.950.000 ₫ (≤ 2.000.000 ₫).
                              </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 p-3 text-foreground">
                              <CheckCircle2 className="size-4 shrink-0 text-primary" />
                              <span>
                                Đã bật thể lệ tự sinh và tách riêng ô đồng ý nhận tin khuyến mãi
                                (CMP-03).
                              </span>
                            </div>
                          </div>
                        </ModalBody>
                        <ModalFooter>
                          <Button variant="secondary" onClick={close}>
                            Đóng
                          </Button>
                          <Button
                            onClick={() => {
                              toast.success('Đã phát hành chương trình Lộc Xuân Trà Sữa Hà!');
                              close();
                            }}
                          >
                            Xác nhận phát hành
                          </Button>
                        </ModalFooter>
                      </>
                    )}
                  </Modal>
                </ModalTrigger>

                {/* AlertDialog: Reopen voucher */}
                <ModalTrigger>
                  <Button variant="secondary" size="small" leadingIcon={RotateCcw}>
                    Mở lại mã (AlertDialog)
                  </Button>
                  <AlertDialog
                    title="Mở lại mã PL94K7 đã đổi nhầm? (PRZ-10)"
                    description="Chỉ Chủ quán (Owner) mới có quyền mở lại mã. Hành động này sẽ được ghi vào Nhật ký kiểm toán (Audit Log ORG-06)."
                    cancelLabel="Huỷ"
                    confirmLabel="Xác nhận mở lại"
                    onConfirm={() => {
                      toast.info('Đã mở lại mã PL94K7 và ghi Audit Log.');
                    }}
                  />
                </ModalTrigger>

                {/* Drawer: Player / Play Drawer */}
                <DrawerTrigger>
                  <Button variant="secondary" size="small" leadingIcon={Eye}>
                    Chi tiết khách (Drawer)
                  </Button>
                  <Drawer placement="end">
                    <DrawerHeader
                      title="Nguyễn Minh Anh · 090***482"
                      description="Khách quay lại lần 2 · Đã đồng ý nhận ưu đãi qua Zalo OA."
                    />
                    <DrawerBody>
                      <div className="grid gap-3 text-xs">
                        <div className="rounded-2xl border p-3.5">
                          <div className="font-semibold text-foreground">
                            Lượt 1 · 26/01/2027 14:02
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            Trúng: Up size L miễn phí · Mã PL94K7 · Đã đổi tại Quán Nguyễn Huệ
                          </div>
                        </div>
                        <div className="rounded-2xl border p-3.5">
                          <div className="font-semibold text-foreground">
                            Lượt 2 · 29/01/2027 19:15
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            Trúng: Giảm 15.000đ đơn từ 45k · Mã KT82M1 · Đã đổi tại Quán Cầu Giấy
                          </div>
                        </div>
                      </div>
                    </DrawerBody>
                  </Drawer>
                </DrawerTrigger>

                {/* Popover: Simulation */}
                <PopoverTrigger>
                  <Button variant="secondary" size="small">
                    Mô phỏng 1.000 khách (Popover)
                  </Button>
                  <Popover showArrow>
                    <PopoverHeader
                      title="Kết quả mô phỏng 1.000 lượt (PRZ-08)"
                      description="Chạy thử 500 kịch bản với lưu lượng 80 khách/ngày và cơ chế rải quà theo giờ mở cửa:"
                    />
                    <div className="grid gap-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rủi ro hết quà sớm:</span>
                        <span className="font-semibold text-success">6.2% (An toàn ≤ 10%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chi phí quà dự kiến:</span>
                        <span className="font-mono font-semibold">1.840.000 ₫</span>
                      </div>
                    </div>
                  </Popover>
                </PopoverTrigger>

                {/* Dropdown */}
                <Dropdown>
                  <DropdownTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 text-body-medium text-text-primary shadow-xs">
                    <span>Thao tác</span>
                    <ChevronDown className="size-3.5" />
                  </DropdownTrigger>
                  <DropdownPopover aria-label="Quản lý chương trình" placement="bottom end">
                    <DropdownGroup label="Quản lý chương trình">
                      <DropdownItem onSelect={() => toast.success('Đã sao chép link ?ch=qr-ban')}>
                        <Copy className="size-4" />
                        <span>Sao chép link QR bàn</span>
                      </DropdownItem>
                      <DropdownItem onSelect={() => toast.success('Đang tải file Standee A4...')}>
                        <Download className="size-4" />
                        <span>Tải mẫu in Standee &amp; Tent card</span>
                      </DropdownItem>
                    </DropdownGroup>
                    <DropdownDivider />
                    <DropdownItem className="text-destructive">
                      <Trash2 className="size-4" />
                      <span>Kết thúc chương trình ngay</span>
                    </DropdownItem>
                  </DropdownPopover>
                </Dropdown>

                {/* Direct Toast trigger */}
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() =>
                    toast.success('Đã xác nhận trao quà mã PL94K7!', {
                      description: 'Ghi nhận 1 khách tới quầy tại Cơ sở Nguyễn Huệ.',
                    })
                  }
                >
                  Thử Toast
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
