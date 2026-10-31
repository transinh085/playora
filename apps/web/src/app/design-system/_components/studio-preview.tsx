'use client';

import { Alert, AlertDescription, AlertTitle } from '@playora/ui/components/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@playora/ui/components/alert-dialog';
import { Avatar, AvatarFallback } from '@playora/ui/components/avatar';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@playora/ui/components/card';
import { Checkbox } from '@playora/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@playora/ui/components/dialog';
import {
  Drawer,
  DrawerFileCard,
  DrawerHeader,
  DrawerMetricCard,
  DrawerMetricGrid,
  DrawerNoteCard,
  DrawerPropertyList,
  DrawerPropertyRow,
  DrawerSummary,
  DrawerTabs,
  DrawerTabsContent,
  DrawerTabsList,
  DrawerTabsTrigger,
} from '@playora/ui/components/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@playora/ui/components/dropdown-menu';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@playora/ui/components/popover';
import { Progress } from '@playora/ui/components/progress';
import { RadioGroup, RadioGroupItem } from '@playora/ui/components/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@playora/ui/components/sheet';
import { Skeleton } from '@playora/ui/components/skeleton';
import { Slider } from '@playora/ui/components/slider';
import { Toaster, toast } from '@playora/ui/components/sonner';
import { Switch } from '@playora/ui/components/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@playora/ui/components/tabs';
import { Textarea } from '@playora/ui/components/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
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
  ChevronsUpDown,
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
  Info,
  LayoutGrid,
  LayoutTemplate,
  ListOrdered,
  Moon,
  MoreHorizontal,
  Palette,
  PanelLeft,
  PauseCircle,
  Phone,
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
  Users,
} from '@playora/ui/icons';
import { useCallback, useEffect, useState } from 'react';
import { previewState, StateMatrix } from './state-matrix';

const SIDEBAR_DEMO_ROWS = [
  {
    id: 0,
    name: 'Lộc Xuân Trà Sữa Hà 2027',
    gradient: 'from-emerald-400 to-cyan-500',
    status: 'live' as const,
    template: 'Vòng quay',
    skin: 'Skin Tết',
    tone: 'orange' as const,
    skinTone: 'rose' as const,
    period: '14th Feb, 2027',
    redeemed: '276 khách',
    rate: '92.4%',
  },
  {
    id: 1,
    name: 'Cào Thẻ Ô Long Kem Phô Mai',
    gradient: 'from-rose-400 to-red-500',
    status: 'live' as const,
    template: 'Thẻ cào',
    skin: 'Ban ngày',
    tone: 'teal' as const,
    skinTone: 'blue' as const,
    period: '18th Feb, 2027',
    redeemed: '142 khách',
    rate: '88.1%',
  },
  {
    id: 2,
    name: 'Mở Hộp Quà Thứ 3 – Thứ 5',
    gradient: 'from-amber-400 to-orange-500',
    status: 'scheduled' as const,
    template: 'Mở hộp',
    skin: 'Lấp ngày vắng',
    tone: 'blue' as const,
    skinTone: 'cyan' as const,
    period: '22nd Feb, 2027',
    redeemed: 'Mở 02/02',
    rate: '79.5%',
  },
  {
    id: 3,
    name: 'Apex Consulting (Tri Ân Doanh Nghiệp)',
    gradient: 'from-cyan-400 to-blue-500',
    status: 'live' as const,
    template: 'Vòng quay',
    skin: 'Khách VIP',
    tone: 'cyan' as const,
    skinTone: 'indigo' as const,
    period: '25th Feb, 2027',
    redeemed: '$182,450',
    rate: '92.0%',
  },
  {
    id: 4,
    name: 'Khai Trương Cơ Sở Thảo Điền',
    gradient: 'from-fuchsia-400 to-purple-500',
    status: 'draft' as const,
    template: 'Vòng quay',
    skin: 'Khai trương',
    tone: 'purple' as const,
    skinTone: 'pink' as const,
    period: '28th Feb, 2027',
    redeemed: 'Nháp',
    rate: '74.2%',
  },
  {
    id: 5,
    name: 'Săn Ly Giữ Nhiệt Phiên Bản Giới Hạn',
    gradient: 'from-cyan-400 to-blue-500',
    status: 'paused' as const,
    template: 'Thẻ cào',
    skin: 'Quà VIP',
    tone: 'pink' as const,
    skinTone: 'purple' as const,
    period: '03rd Mar, 2027',
    redeemed: '64 khách',
    rate: '81.6%',
  },
  {
    id: 6,
    name: 'Đêm Nhạc Acoustic Cuối Tuần',
    gradient: 'from-emerald-400 to-cyan-500',
    status: 'draft' as const,
    template: 'Mở hộp',
    skin: 'Gala YEP',
    tone: 'rose' as const,
    skinTone: 'indigo' as const,
    period: '08th Mar, 2027',
    redeemed: 'Nháp',
    rate: '76.8%',
  },
  {
    id: 7,
    name: 'Combo Trà Trái Cây Giờ Trưa',
    gradient: 'from-rose-400 to-red-500',
    status: 'live' as const,
    template: 'Vòng quay',
    skin: 'Khung giờ vàng',
    tone: 'indigo' as const,
    skinTone: 'orange' as const,
    period: '12th Mar, 2027',
    redeemed: '198 khách',
    rate: '90.3%',
  },
] as const;

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
    badgeColor: 'default' | 'success' | 'warning' | 'info';
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
        badgeColor: 'success',
        desc: 'Tỉ lệ khách trúng voucher đã trực tiếp mang mã tới quầy đổi đồ uống.',
      },
      {
        label: 'Khách quay lại',
        value: '184',
        badge: 'Cao',
        badgeColor: 'info',
        desc: 'Số lượt khách thân thiết quay lại quán từ lần thứ 2 trở lên trong tháng.',
      },
      {
        label: 'Chi phí mỗi khách',
        value: '6.400 ₫',
        badge: 'Tối ưu',
        badgeColor: 'success',
        desc: 'Chi phí quà thực tế chia cho mỗi khách tới quầy (ngân sách 2.5 triệu).',
      },
      {
        label: 'Độ hài lòng (CSAT)',
        value: '96%',
        badge: 'Xuất sắc',
        badgeColor: 'success',
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
        badgeColor: 'success',
        desc: 'Khách cào trúng và đổi trực tiếp tại quầy trong ngày.',
      },
      {
        label: 'Khách mới',
        value: '96',
        badge: 'Cao',
        badgeColor: 'info',
        desc: 'Số khách lần đầu ghé quán qua mã QR tại bàn.',
      },
      {
        label: 'Chi phí mỗi khách',
        value: '7.800 ₫',
        badge: 'Hợp lý',
        badgeColor: 'info',
        desc: 'Chi phí quà trung bình trên mỗi khách hàng mới.',
      },
      {
        label: 'Độ hài lòng (CSAT)',
        value: '92%',
        badge: 'Tốt',
        badgeColor: 'success',
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
        badgeColor: 'warning',
        desc: 'Tỉ lệ tăng trưởng lượng khách giờ vắng thứ 3 và thứ 5.',
      },
      {
        label: 'Khách quay lại',
        value: '112',
        badge: 'Khá',
        badgeColor: 'info',
        desc: 'Khách đặt bàn hoặc tới quầy vào khung giờ khuyến mãi.',
      },
      {
        label: 'Chi phí quà',
        value: '1.450.000 ₫',
        badge: 'Kiểm soát',
        badgeColor: 'success',
        desc: 'Tổng chi phí quà đã phát ra trong tuần.',
      },
      {
        label: 'Độ hài lòng',
        value: '89%',
        badge: 'Tốt',
        badgeColor: 'success',
        desc: 'Khách hàng hài lòng với bất ngờ khi mở hộp quà.',
      },
    ],
  },
  3: {
    // 1-to-1 Louis CRM openDrawer(3) Account: Apex Consulting
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
        badgeColor: 'success',
        desc: 'Response rate indicates the percentage of recipients who respond to emails or surveys.',
      },
      {
        label: 'Email Exchange Rate',
        value: '1,198',
        badge: 'High',
        badgeColor: 'info',
        desc: 'Email exchange rate reflects the percentage of emails that result in meaningful interactions.',
      },
      {
        label: 'Net Promoter Score',
        value: '75',
        badge: 'High',
        badgeColor: 'info',
        desc: 'Net Promoter Score gauges customer loyalty by asking how likely they are to recommend the service or product to others.',
      },
      {
        label: 'Customer Satisfaction',
        value: '94%',
        badge: 'Very Good',
        badgeColor: 'success',
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
  {
    id: 4,
    title: 'Multi-Region Deployment Discussion',
    date: 'Aug 28, 2026',
    author: 'By Sarah Jenkins',
    content:
      'Evaluated failover latency between Singapore and Frankfurt nodes. Proposed active-active sync configuration for high-availability database cluster.',
  },
  {
    id: 5,
    title: 'SLA & Priority Support Escalation',
    date: 'Sep 05, 2026',
    author: 'By Marcus Vance',
    content:
      'Reviewed Q3 downtime credits and confirmed 99.98% uptime achieved. Upgraded incident escalation contact to tier-1 enterprise on-call rotation.',
  },
  {
    id: 6,
    title: 'API Rate Limit Optimization',
    date: 'Sep 14, 2026',
    author: 'By Emily Watson',
    content:
      'Increased burst capacity to 12,000 req/min for black friday promotional campaigns. Verified webhook delivery backoff retry policies.',
  },
  {
    id: 7,
    title: 'Executive Sponsorship Sync',
    date: 'Sep 21, 2026',
    author: 'By David Miller',
    content:
      'Quarterly business review with Chief Revenue Officer. Aligned on expansion into Vietnam & Southeast Asia market for franchise loyalty.',
  },
  {
    id: 8,
    title: 'Custom Reporting Requirements',
    date: 'Oct 02, 2026',
    author: 'By Jessica Taylor',
    content:
      'Finance team requested CSV export capabilities for voucher redemption reconciliations with store POS terminals.',
  },
];

const DRAWER_FILES_2026 = [
  { name: 'Master_Service_Agreement_2026.pdf', size: '2.4 MB', date: 'Jul 22, 2026' },
  { name: 'Enterprise_Security_Whitepaper.pdf', size: '4.8 MB', date: 'Aug 15, 2026' },
  { name: 'Architecture_Blueprint_v3.pdf', size: '8.1 MB', date: 'Aug 28, 2026' },
  { name: 'SOC2_Type_II_Attestation.pdf', size: '1.9 MB', date: 'Sep 05, 2026' },
  { name: 'Q3_Executive_Outcome_Report.xlsx', size: '640 KB', date: 'Sep 21, 2026' },
  { name: 'Brand_Assets_Vector_Pack.zip', size: '18.5 MB', date: 'Oct 02, 2026' },
];

const DRAWER_FILES_2025 = [
  { name: 'Annual_Audit_Report_2025.pdf', size: '3.2 MB', date: 'Dec 18, 2025' },
  { name: 'Pilot_Campaign_Review.pptx', size: '12.4 MB', date: 'Nov 04, 2025' },
];

const BUTTON_VARIANTS = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'white',
  'destructive',
  'link',
] as const;

const BUTTON_STATES = ['default', 'hover', 'focus', 'active', 'disabled', 'loading'] as const;

export function StudioPreview() {
  const [winRate, setWinRate] = useState([25]);
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
    <TooltipProvider>
      <div className="grid gap-10">
        <Toaster />

        {/* 0. Louis CRM / Attio 1-to-1 Workspace Shell, Resizable Sidebar & Data Grid */}
        <div className="grid gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              0. Khung làm việc Studio, Sidebar &amp; Bảng dữ liệu (1-to-1 Louis CRM / Attio Style)
            </h3>
            <p className="text-xs text-muted-foreground">
              Sidebar <code className="font-mono">w-[208px]</code> nền{' '}
              <code className="font-mono">bg-neutral-50 dark:bg-[#0A0A0A]</code>; mục đang chọn dùng{' '}
              <code className="font-mono">bg-neutral-200/80 dark:bg-[#171717]</code>; các nhóm điều
              hướng có thể thu gọn (Accordion); chân Sidebar và dòng tổng kết bảng dùng{' '}
              <code className="font-mono">bg-neutral-100 dark:bg-[#171717]</code>; từng cột có icon
              riêng, thanh kéo giãn xanh dương khi hover và nhãn phân loại pastel{' '}
              <code className="font-mono">10px</code>.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0A0A0A]">
            <div className="flex flex-col md:flex-row">
              {/* Left Sidebar replica (1-to-1 Louis CRM with smooth collapse & accordion transitions) */}
              <div
                style={{ width: demoSidebarCollapsed ? 52 : 224 }}
                className="relative flex shrink-0 flex-col border-b border-neutral-200 bg-neutral-50 text-neutral-900 transition-[width] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] select-none md:border-r md:border-b-0 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-[#FAFAFA]"
              >
                {/* Workspace Top Bar (h-[48px] py-2 px-3 gap-1) */}
                <div className="flex h-[48px] w-full shrink-0 flex-row items-center gap-1 px-3 py-2">
                  {!demoSidebarCollapsed && (
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 animate-crm-fade-in cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-neutral-600 transition-all duration-150 hover:bg-neutral-200 hover:text-neutral-900 active:scale-[0.98] dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
                    >
                      <div className="h-4 w-4 shrink-0 rounded-md bg-gradient-to-tr from-emerald-400 to-cyan-500 shadow-sm" />
                      <span className="truncate text-sm font-medium">Trà Sữa Hà</span>
                      <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" />
                    </button>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setDemoSidebarCollapsed((prev) => !prev)}
                        aria-label={
                          demoSidebarCollapsed
                            ? 'Mở rộng thanh điều hướng'
                            : 'Thu gọn thanh điều hướng'
                        }
                        className="mx-auto flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-2 transition-all duration-150 hover:bg-neutral-200 active:scale-95 dark:hover:bg-white/5"
                      >
                        <PanelLeft className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                      </button>
                    </TooltipTrigger>
                    {demoSidebarCollapsed && (
                      <TooltipContent side="right">Mở rộng thanh điều hướng</TooltipContent>
                    )}
                  </Tooltip>
                </div>

                {/* Navigation Items Container (p-3 pt-2 pb-2 gap-5 flex-1) */}
                <div className="flex flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto p-3 pt-2 pb-2">
                  {/* Primary Navigation */}
                  <div className="flex w-full flex-col gap-1">
                    {[
                      { key: 'home', label: 'Trang chủ', Icon: House },
                      { key: 'redeem', label: 'Đổi quà', Icon: TicketCheck },
                      { key: 'search', label: 'Thao tác nhanh', Icon: Search },
                    ].map(({ key, label, Icon }) => {
                      const active = activeNavKey === key;
                      return (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setActiveNavKey(key)}
                              className={`flex cursor-pointer items-center gap-2 rounded-md transition-all duration-150 active:scale-[0.98] ${
                                demoSidebarCollapsed
                                  ? 'mx-auto h-8 w-8 justify-center p-2'
                                  : 'px-1 py-1 text-left'
                              } ${
                                active
                                  ? 'bg-neutral-200/80 font-medium text-neutral-900 dark:bg-[#171717] dark:text-[#FAFAFA]'
                                  : 'font-medium text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]'
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              {!demoSidebarCollapsed && (
                                <span className="truncate text-sm animate-crm-fade-in">
                                  {label}
                                </span>
                              )}
                            </button>
                          </TooltipTrigger>
                          {demoSidebarCollapsed && (
                            <TooltipContent side="right">{label}</TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>

                  {/* Minigame Accordion Section */}
                  <div className="flex w-full flex-col gap-2">
                    {!demoSidebarCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleDemoGroup('minigames')}
                        className="group flex animate-crm-fade-in cursor-pointer items-center gap-2.5 px-2 text-left"
                      >
                        <span className="text-[13px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-700 dark:text-[#737373] dark:group-hover:text-[#A3A3A3]">
                          Minigame
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-neutral-500 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:text-[#737373] ${
                            demoClosedGroups.minigames ? '-rotate-90' : 'rotate-0'
                          }`}
                        />
                      </button>
                    )}
                    <div
                      className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        demoClosedGroups.minigames && !demoSidebarCollapsed
                          ? 'pointer-events-none -mt-2 grid-rows-[0fr] opacity-0'
                          : 'mt-0 grid-rows-[1fr] opacity-100'
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
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setActiveNavKey(key)}
                                  className={`flex cursor-pointer items-center gap-2 rounded-md transition-all duration-150 active:scale-[0.98] ${
                                    demoSidebarCollapsed
                                      ? 'mx-auto h-8 w-8 justify-center p-2'
                                      : 'px-1 py-1 text-left'
                                  } ${
                                    active
                                      ? 'bg-neutral-200/80 font-medium text-neutral-900 dark:bg-[#171717] dark:text-[#FAFAFA]'
                                      : 'font-medium text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]'
                                  }`}
                                >
                                  <Icon className="h-4 w-4 shrink-0" />
                                  {!demoSidebarCollapsed && (
                                    <span className="truncate text-sm animate-crm-fade-in">
                                      {label}
                                    </span>
                                  )}
                                </button>
                              </TooltipTrigger>
                              {demoSidebarCollapsed && (
                                <TooltipContent side="right">{label}</TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Organization Accordion Section */}
                  <div className="mt-1 flex w-full flex-col gap-2">
                    {!demoSidebarCollapsed && (
                      <button
                        type="button"
                        onClick={() => toggleDemoGroup('organization')}
                        className="group flex animate-crm-fade-in cursor-pointer items-center gap-2.5 px-2 text-left"
                      >
                        <span className="text-[13px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-700 dark:text-[#737373] dark:group-hover:text-[#A3A3A3]">
                          Tổ chức
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-neutral-500 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:text-[#737373] ${
                            demoClosedGroups.organization ? '-rotate-90' : 'rotate-0'
                          }`}
                        />
                      </button>
                    )}
                    <div
                      className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        demoClosedGroups.organization && !demoSidebarCollapsed
                          ? 'pointer-events-none -mt-2 grid-rows-[0fr] opacity-0'
                          : 'mt-0 grid-rows-[1fr] opacity-100'
                      }`}
                    >
                      <div className="flex w-full flex-col gap-1 overflow-hidden">
                        {[
                          { key: 'settings', label: 'Cài đặt', Icon: Settings },
                          { key: 'billing', label: 'Gói & sử dụng', Icon: Gem },
                        ].map(({ key, label, Icon }) => {
                          const active = activeNavKey === key;
                          return (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setActiveNavKey(key)}
                                  className={`flex cursor-pointer items-center gap-2 rounded-md transition-all duration-150 active:scale-[0.98] ${
                                    demoSidebarCollapsed
                                      ? 'mx-auto h-8 w-8 justify-center p-2'
                                      : 'px-1 py-1 text-left'
                                  } ${
                                    active
                                      ? 'bg-neutral-200/80 font-medium text-neutral-900 dark:bg-[#171717] dark:text-[#FAFAFA]'
                                      : 'font-medium text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]'
                                  }`}
                                >
                                  <Icon className="h-4 w-4 shrink-0" />
                                  {!demoSidebarCollapsed && (
                                    <span className="truncate text-sm animate-crm-fade-in">
                                      {label}
                                    </span>
                                  )}
                                </button>
                              </TooltipTrigger>
                              {demoSidebarCollapsed && (
                                <TooltipContent side="right">{label}</TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Profile Row (h-[44px] bg-neutral-100 dark:bg-[#171717] border-t) */}
                <div
                  className={`flex h-[44px] shrink-0 items-center gap-1 border-t border-neutral-200 bg-neutral-100 p-2 dark:border-white/10 dark:bg-[#171717] ${
                    demoSidebarCollapsed ? 'justify-center' : 'justify-between'
                  }`}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex cursor-pointer items-center gap-2 rounded-md text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA] ${
                          demoSidebarCollapsed ? 'h-8 w-8 justify-center p-2' : 'flex-1 px-1 py-1'
                        }`}
                      >
                        <div className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-sm" />
                        {!demoSidebarCollapsed && (
                          <span className="truncate text-sm font-medium animate-crm-fade-in">
                            Chị Hà
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    {demoSidebarCollapsed && (
                      <TooltipContent side="right">Chị Hà (ha@playora.vn)</TooltipContent>
                    )}
                  </Tooltip>
                  {!demoSidebarCollapsed && (
                    <div className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-2 transition-colors hover:bg-neutral-200 dark:hover:bg-white/5">
                      <MoreHorizontal className="h-4 w-4 text-neutral-500 dark:text-[#A3A3A3]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Content Pane: Top Header + Secondary Toolbar + Data Table + Sticky Footer */}
              <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#0A0A0A]">
                {/* Top Header (h-[48px] p-2 border-b) */}
                <div className="flex h-[48px] shrink-0 items-center justify-between border-b border-neutral-200 bg-white p-2 dark:border-white/10 dark:bg-[#0A0A0A]">
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

                {/* Secondary Toolbar & Filter Controls (h-[48px] p-2 border-b) */}
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
                      className="hidden sm:flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 text-[13px] font-medium text-blue-600 transition-all hover:bg-blue-500/20 active:scale-95 dark:text-blue-400"
                      title="Kích hoạt trigger openDrawer(3) (Apex Consulting - Louis CRM Pattern)"
                    >
                      <PanelLeft className="h-3.5 w-3.5 -scale-x-100" />
                      <span>openDrawer(3)</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-neutral-600 transition-all duration-150 hover:bg-neutral-100 active:scale-[0.97] dark:text-[#A3A3A3] dark:hover:bg-white/5"
                        >
                          <LayoutGrid className="h-4 w-4" />
                          <span className="hidden text-sm font-normal sm:block">Layout</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {(
                          [
                            { key: 'compact', label: 'Compact (36px)' },
                            { key: 'default', label: 'Default (44px)' },
                            { key: 'comfortable', label: 'Comfortable (56px)' },
                          ] as const
                        ).map((item) => (
                          <DropdownMenuItem
                            key={item.key}
                            onClick={() => {
                              setDemoDensity(item.key);
                              setDemoViewDirty(true);
                            }}
                            className="justify-between"
                          >
                            <span>{item.label}</span>
                            {demoDensity === item.key && (
                              <Check className="h-3.5 w-3.5 text-blue-500" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
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
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {(
                          [
                            { key: 'name', label: 'Chương trình' },
                            { key: 'template', label: 'Categories' },
                            { key: 'period', label: 'Start Date' },
                            { key: 'rate', label: 'Response Rate' },
                          ] as const
                        ).map((item) => (
                          <DropdownMenuItem
                            key={item.key}
                            onClick={() => toggleDemoSort(item.key)}
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
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

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

                {/* Grid Table (h-[44px] header & rows, sticky footer) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-[#0A0A0A]">
                      <tr>
                        <th className="relative h-[44px] w-[52px] border-r border-neutral-200 px-2 text-center font-medium text-neutral-500 dark:border-white/10 dark:text-[#737373]">
                          #
                          <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                            <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                          </div>
                        </th>
                        <th className="relative h-[44px] border-r border-neutral-200 px-3 font-normal text-neutral-900 dark:border-white/10 dark:text-[#FAFAFA]">
                          <button
                            type="button"
                            onClick={() => toggleDemoSort('name')}
                            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
                          >
                            <Building2 className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                            <span>Chương trình</span>
                            <ArrowUp
                              className={`h-3.5 w-3.5 text-blue-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                demoSortKey === 'name'
                                  ? 'scale-100 opacity-100'
                                  : 'w-0 scale-75 opacity-0'
                              } ${demoSortKey === 'name' && demoSortDir === 'desc' ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                            <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                          </div>
                        </th>
                        <th className="relative h-[44px] border-r border-neutral-200 px-3 font-normal text-neutral-900 dark:border-white/10 dark:text-[#FAFAFA]">
                          <button
                            type="button"
                            onClick={() => toggleDemoSort('template')}
                            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
                          >
                            <Tags className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                            <span>Categories</span>
                            <ArrowUp
                              className={`h-3.5 w-3.5 text-blue-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                demoSortKey === 'template'
                                  ? 'scale-100 opacity-100'
                                  : 'w-0 scale-75 opacity-0'
                              } ${demoSortKey === 'template' && demoSortDir === 'desc' ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                            <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                          </div>
                        </th>
                        <th className="relative h-[44px] border-r border-neutral-200 px-3 font-normal text-neutral-900 dark:border-white/10 dark:text-[#FAFAFA]">
                          <button
                            type="button"
                            onClick={() => toggleDemoSort('period')}
                            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
                          >
                            <Calendar className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                            <span>Start Date</span>
                            <ArrowUp
                              className={`h-3.5 w-3.5 text-blue-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                demoSortKey === 'period'
                                  ? 'scale-100 opacity-100'
                                  : 'w-0 scale-75 opacity-0'
                              } ${demoSortKey === 'period' && demoSortDir === 'desc' ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                            <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
                          </div>
                        </th>
                        <th className="relative h-[44px] border-r border-neutral-200 px-3 font-normal text-neutral-900 dark:border-white/10 dark:text-[#FAFAFA]">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                            <span>Kết quả</span>
                          </div>
                          <div className="group absolute top-0 right-0 z-30 flex h-full w-[10px] translate-x-1/2 cursor-col-resize justify-center">
                            <div className="h-full w-[2px] transition-colors duration-200 group-hover:bg-blue-500" />
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
                            <ArrowUp
                              className={`h-3.5 w-3.5 text-blue-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                demoSortKey === 'rate'
                                  ? 'scale-100 opacity-100'
                                  : 'w-0 scale-75 opacity-0'
                              } ${demoSortKey === 'rate' && demoSortDir === 'desc' ? 'rotate-180' : ''}`}
                            />
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
                            style={{ animationDelay: `${idx * 25}ms` }}
                            className={`group animate-crm-row-in cursor-pointer transition-[height,background-color] duration-[340ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
                                <Badge variant={row.tone}>{row.template}</Badge>
                                <Badge variant={row.skinTone}>{row.skin}</Badge>
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
                                <Badge
                                  variant={
                                    Number.parseFloat(row.rate) >= 90
                                      ? 'success'
                                      : Number.parseFloat(row.rate) >= 80
                                        ? 'blue'
                                        : 'warning'
                                  }
                                >
                                  {Number.parseFloat(row.rate) >= 90
                                    ? 'Excellent'
                                    : Number.parseFloat(row.rate) >= 80
                                      ? 'Good'
                                      : 'Average'}
                                </Badge>
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

          {/* Side Drawer Component (Louis CRM 1-to-1 Pattern) */}
          <Drawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            defaultWidth={612}
            minWidth={380}
            resizable={true}
          >
            {/* Sticky Header with Breadcrumb and Actions */}
            <DrawerHeader
              onClose={() => setDrawerOpen(false)}
              breadcrumbs={
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 dark:text-[#737373]">Khách hàng / CRM</span>
                  <span className="text-neutral-400 dark:text-[#737373]">/</span>
                  <span className="font-medium text-neutral-900 dark:text-[#FAFAFA]">
                    {selectedAccount?.company ?? 'Apex Consulting'}
                  </span>
                </div>
              }
              actions={
                <button
                  type="button"
                  onClick={() => toast.success('Đã mở tạo hợp đồng mới')}
                  className="flex h-full items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-normal text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-[#A3A3A3] dark:hover:bg-white/5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Hợp đồng</span>
                </button>
              }
            />

            {/* Account Summary Header */}
            <DrawerSummary
              avatar={
                <div
                  className={`h-[60px] w-[60px] rounded-[10px] bg-gradient-to-tr ${selectedAccount?.gradient ?? 'from-cyan-400 to-blue-500'} border border-white shadow-md dark:border-neutral-800 shrink-0`}
                />
              }
              title={selectedAccount?.company ?? 'Apex Consulting'}
              teamAvatars={
                <div className="flex items-center -space-x-1.5">
                  <div className="h-4 w-4 rounded-full border border-white bg-gradient-to-tr from-cyan-400 to-blue-500 dark:border-[#0A0A0A]" />
                  <div className="h-4 w-4 rounded-full border border-white bg-gradient-to-tr from-emerald-400 to-teal-500 dark:border-[#0A0A0A]" />
                  <div className="h-4 w-4 rounded-full border border-white bg-gradient-to-tr from-rose-400 to-red-500 dark:border-[#0A0A0A]" />
                  <div className="h-4 w-4 rounded-full border border-white bg-gradient-to-tr from-amber-400 to-orange-500 dark:border-[#0A0A0A]" />
                </div>
              }
              subtitle={
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span>{selectedAccount?.legalName ?? 'Apex Consulting, Inc'}</span>
                  <span>•</span>
                  <span className="font-medium text-neutral-700 dark:text-[#A3A3A3]">
                    {selectedAccount?.amount ?? '$182,450.00'}
                  </span>
                  <div className="flex items-center gap-1.5 ml-2">
                    {selectedAccount?.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-normal text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-[#A3A3A3]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              }
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => toast.info('Đang kết nối cuộc gọi thoại...')}
                    className="flex h-8 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:text-[#FAFAFA] dark:hover:bg-white/10"
                  >
                    <Phone className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Gọi điện</span>
                  </button>
                  <a
                    href={`mailto:${selectedAccount?.email ?? 'contact@apexconsulting.co'}`}
                    className="flex h-8 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:text-[#FAFAFA] dark:hover:bg-white/10"
                  >
                    <span className="font-mono text-xs text-neutral-500">@</span>
                    <span>Gửi Email</span>
                  </a>
                  <a
                    href={`https://${selectedAccount?.website ?? 'apexconsulting.co'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-8 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:text-[#FAFAFA] dark:hover:bg-white/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Website</span>
                  </a>
                </>
              }
            />

            {/* Tabs System with animated sliding indicator */}
            <DrawerTabs
              value={activeDrawerTab}
              onValueChange={(val) => setActiveDrawerTab(val as 'details' | 'notes' | 'files')}
            >
              <DrawerTabsList>
                <DrawerTabsTrigger value="details">Chi tiết</DrawerTabsTrigger>
                <DrawerTabsTrigger value="notes" count={DRAWER_NOTES.length}>
                  Ghi chú
                </DrawerTabsTrigger>
                <DrawerTabsTrigger
                  value="files"
                  count={DRAWER_FILES_2026.length + DRAWER_FILES_2025.length}
                >
                  Tài liệu
                </DrawerTabsTrigger>
              </DrawerTabsList>

              {/* Tab 1: Chi tiết */}
              <DrawerTabsContent value="details" className="p-3">
                {/* Property Key-Value List */}
                <DrawerPropertyList className="border-b-0 pb-2">
                  <DrawerPropertyRow
                    icon={<span className="font-mono text-xs">@</span>}
                    label="Email"
                  >
                    <a
                      href={`mailto:${selectedAccount?.email ?? 'contact@apexconsulting.co'}`}
                      className="text-blue-500 hover:underline"
                    >
                      {selectedAccount?.email ?? 'contact@apexconsulting.co'}
                    </a>
                  </DrawerPropertyRow>
                  <DrawerPropertyRow icon={<ExternalLink className="h-4 w-4" />} label="Website">
                    <a
                      href={`https://${selectedAccount?.website ?? 'apexconsulting.co'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {selectedAccount?.website ?? 'apexconsulting.co'}
                    </a>
                  </DrawerPropertyRow>
                  <DrawerPropertyRow icon={<Building2 className="h-4 w-4" />} label="Địa điểm">
                    <span>{selectedAccount?.location ?? 'Austin, Texas, USA'}</span>
                  </DrawerPropertyRow>
                  <DrawerPropertyRow icon={<Building2 className="h-4 w-4" />} label="Thành lập">
                    <span>{selectedAccount?.founded ?? 'March 2013'}</span>
                  </DrawerPropertyRow>
                  <DrawerPropertyRow icon={<Users className="h-4 w-4" />} label="Đại diện">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 shadow-2xs" />
                      <span>{selectedAccount?.founder ?? 'James Karen Lee'}</span>
                    </div>
                  </DrawerPropertyRow>
                  <DrawerPropertyRow icon={<Users className="h-4 w-4" />} label="Nhân sự">
                    <span>{selectedAccount?.employees ?? '50-100'}</span>
                  </DrawerPropertyRow>
                </DrawerPropertyList>

                {/* Overview Cards Section */}
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-medium text-neutral-900 dark:text-[#FAFAFA]">
                      Chỉ số hiệu quả (Overview)
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <button
                        type="button"
                        onClick={() => toast.info('Đổi cấu hình thẻ tổng quan')}
                        className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-100 dark:hover:bg-white/5"
                      >
                        <LayoutTemplate className="h-3.5 w-3.5" />
                        <span>Đổi thẻ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.success('Đã làm mới dữ liệu')}
                        className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-100 dark:hover:bg-white/5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Làm mới</span>
                      </button>
                    </div>
                  </div>
                  <DrawerMetricGrid>
                    {selectedAccount?.metrics.map((m) => (
                      <DrawerMetricCard
                        key={m.label}
                        label={m.label}
                        value={m.value}
                        badge={m.badge}
                        badgeColor={m.badgeColor}
                        description={m.desc}
                      />
                    ))}
                  </DrawerMetricGrid>
                </div>
              </DrawerTabsContent>

              {/* Tab 2: Ghi chú (Notes - 8 Note Cards) */}
              <DrawerTabsContent value="notes" className="flex flex-col gap-3 p-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-neutral-500 dark:text-[#737373]">
                    Tổng cộng {DRAWER_NOTES.length} ghi chú hoạt động
                  </span>
                  <button
                    type="button"
                    onClick={() => toast.info('Tạo ghi chú mới')}
                    className="flex h-7 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:text-[#FAFAFA] dark:hover:bg-white/10"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Ghi chú mới</span>
                  </button>
                </div>
                <div className="flex flex-col gap-2.5">
                  {DRAWER_NOTES.map((n) => (
                    <DrawerNoteCard
                      key={n.id}
                      icon={<FileText className="h-3.5 w-3.5 text-neutral-500" />}
                      title={n.title}
                      date={n.date}
                      author={n.author}
                      onMore={() => toast.info(`Tùy chọn: ${n.title}`)}
                    >
                      {n.content}
                    </DrawerNoteCard>
                  ))}
                </div>
              </DrawerTabsContent>

              {/* Tab 3: Tài liệu (Files) */}
              <DrawerTabsContent value="files" className="flex flex-col gap-4 p-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium text-neutral-900 dark:text-[#FAFAFA]">
                    Tất cả tài liệu
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toast.info('Thêm thư mục tài liệu')}
                      className="flex h-7 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:text-[#FAFAFA] dark:hover:bg-white/10"
                    >
                      <Plus className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Thêm thư mục</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.info('Tải lên tệp tài liệu mới')}
                      className="flex h-7 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:text-[#FAFAFA] dark:hover:bg-white/10"
                    >
                      <Upload className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Tải lên</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="px-1 text-xs font-medium text-neutral-500">2026</span>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {DRAWER_FILES_2026.map((f) => (
                      <DrawerFileCard
                        key={f.name}
                        icon={<FileText className="h-4 w-4" />}
                        name={f.name}
                        size={f.size}
                        date={f.date}
                        onDownload={() => toast.success(`Đang tải: ${f.name}`)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="px-1 text-xs font-medium text-neutral-500">2025</span>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {DRAWER_FILES_2025.map((f) => (
                      <DrawerFileCard
                        key={f.name}
                        icon={<FileText className="h-4 w-4" />}
                        name={f.name}
                        size={f.size}
                        date={f.date}
                        onDownload={() => toast.success(`Đang tải: ${f.name}`)}
                      />
                    ))}
                  </div>
                </div>
              </DrawerTabsContent>
            </DrawerTabs>
          </Drawer>
        </div>

        {/* 1. Button State Matrix & Sizes */}
        <div className="grid gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                1. Nút hành động (Button · Wensity Primitive with Tactile Depth &amp; Motion)
              </h3>
              <p className="text-xs text-muted-foreground">
                Hệ nút chuẩn Wensity Primitive: 7 biến thể surface roles (default, secondary,
                outline, ghost, white, destructive, link), độ lún vật lý 1px khi nhấn (
                <code className="font-mono">active:translate-y-px</code>), viền bắt sáng (rim &amp;
                catchlight), và hỗ trợ micro-interaction icon motion.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="xs">Cỡ xs (28px)</Button>
              <Button size="sm">Cỡ sm (32px)</Button>
              <Button size="default">
                <Plus className="size-4" />
                Mặc định (36px)
              </Button>
              <Button size="lg">
                <Rocket className="size-4" />
                Cỡ lg (40px)
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Chơi thử">
                    <Play className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Chơi thử bản nháp (không trừ kho thật)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <StateMatrix
            rows={BUTTON_VARIANTS}
            states={BUTTON_STATES}
            render={(variant, state) =>
              state === 'loading' ? (
                <Button variant={variant} loading>
                  Đang lưu…
                </Button>
              ) : (
                <Button variant={variant} {...previewState(state)}>
                  Phát hành
                </Button>
              )
            }
          />

          {/* Micro-interactions & Special States Showcase */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-neutral-50/50 p-3.5 dark:bg-white/[0.02]">
            <span className="text-xs font-medium text-muted-foreground">Micro-interactions:</span>
            <Button rightIcon={<ArrowRight className="size-4" />} rightIconMotion="arrow" size="sm">
              Tiếp tục (Arrow Hover)
            </Button>
            <Button
              variant="secondary"
              rightIcon={<Download className="size-4" />}
              rightIconMotion="download"
              size="sm"
            >
              Tải báo cáo (Download Tick)
            </Button>
            <Button
              variant="destructive"
              leftIcon={<Trash2 className="size-4" />}
              leftIconMotion="trash"
              size="sm"
            >
              Xoá (Trash Shake)
            </Button>
            <Button variant="white" size="sm">
              Nút White
            </Button>
            <Button loading size="sm">
              Đang xử lý
            </Button>
            <Button size="icon-sm" loading aria-label="Đang tải icon" />
          </div>
        </div>

        {/* 2. Semantic Status Badges */}
        <div className="grid gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              2. Nhãn trạng thái & Vòng đời chương trình (Badge · Không bao giờ chỉ dùng màu)
            </h3>
            <p className="text-xs text-muted-foreground">
              Trạng thái chương trình do hệ thống tự suy ra (PRD §3.2) và luôn đi kèm icon hoặc chấm
              chuyển động.
            </p>
          </div>
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="outline" className="gap-1.5">
                <Clock className="size-3 text-muted-foreground" />
                Nháp (Chưa phát hành)
              </Badge>
              <Badge variant="info" className="gap-1.5">
                <Clock className="size-3" />
                Đã lên lịch · Mở 25/01
              </Badge>
              <Badge variant="live" className="gap-1.5">
                <span
                  aria-hidden
                  className="inline-block size-2 animate-live-pulse rounded-full bg-current"
                />
                Đang chạy (On air)
              </Badge>
              <Badge variant="warning" className="gap-1.5">
                <PauseCircle className="size-3" />
                Tạm dừng
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                Đã kết thúc
              </Badge>
              <Badge variant="success" className="gap-1.5">
                <CheckCircle2 className="size-3" />
                Đã trao quà tại quầy
              </Badge>
              <Badge variant="warning" className="gap-1.5">
                <AlertTriangle className="size-3" />
                Quà còn 14% (&lt; 20%)
              </Badge>
              <Badge variant="destructive" className="gap-1.5">
                Đã đổi lúc 14:02 · Quán Q.1
              </Badge>
              <Badge variant="default" className="gap-1.5">
                <Sparkles className="size-3" />
                Playbook: Tết kéo khách
              </Badge>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <span className="mr-1 text-xs font-medium text-muted-foreground">
                Pastel Category Tags (Attio Table):
              </span>
              <Badge variant="orange">Vòng quay · Skin Tết</Badge>
              <Badge variant="teal">Thẻ cào · Ban ngày</Badge>
              <Badge variant="blue">Mở hộp · Lấp ngày vắng</Badge>
              <Badge variant="cyan">Khách quay lại lần 2</Badge>
              <Badge variant="purple">Khai trương cơ sở</Badge>
              <Badge variant="pink">Quà hiện vật VIP</Badge>
              <Badge variant="rose">Thiết kế Canvas</Badge>
              <Badge variant="indigo">Khung giờ vàng</Badge>
            </div>
          </Card>
        </div>

        {/* 3. Inputs & Validation Matrix */}
        <div className="grid gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              3. Trường nhập liệu & Biểu mẫu (Inputs, Controls & Validation Matrix)
            </h3>
            <p className="text-xs text-muted-foreground">
              Đồng bộ hoàn toàn với <code className="font-mono">Button</code>: cùng bo góc{' '}
              <code className="font-mono">rounded-xl</code> (12px), cùng chiều cao chuẩn 36px (
              <code className="font-mono">h-9</code>) và viền focus{' '}
              <code className="font-mono">ring-ring/50</code> 3px.
            </p>
          </div>

          <StateMatrix
            rows={['input'] as const}
            states={['default', 'hover', 'focus', 'disabled', 'invalid']}
            render={(_, state) => (
              <Input
                defaultValue={state === 'invalid' ? 'tet-tra-sua-ha' : 'Vòng quay Tết Trà Sữa Hà'}
                aria-invalid={state === 'invalid' || undefined}
                className="max-w-52"
                {...previewState(state)}
              />
            )}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Thiết lập Luật & Giải (BLD-21 · PRZ-08 · EVT-13)
                </CardTitle>
                <CardDescription>
                  Cấu hình ngân sách, tỷ lệ trúng và mức chống gian lận cho chương trình.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="ds-campaign-name">Tên chương trình</Label>
                  <Input id="ds-campaign-name" defaultValue="Lộc Xuân Trà Sữa Hà 2027" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ds-playbook-select">Mục tiêu (Playbook)</Label>
                    <Select defaultValue="tet_traffic">
                      <SelectTrigger id="ds-playbook-select" className="w-full">
                        <SelectValue placeholder="Chọn mục tiêu" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Playbook F&B (M1)</SelectLabel>
                          <SelectItem value="tet_traffic">Tết: Kéo khách về quán</SelectItem>
                          <SelectItem value="second_visit">Khách quay lại lần 2</SelectItem>
                          <SelectItem value="slow_days">Lấp ngày vắng (Thứ 3–Thứ 5)</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="ds-slug-invalid">Đường dẫn (Trạng thái lỗi trùng)</Label>
                    <Input id="ds-slug-invalid" defaultValue="loc-xuan-2027" aria-invalid />
                    <span className="text-xs text-destructive">
                      Đường dẫn này đã được chương trình khác sử dụng.
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <Label htmlFor="ds-win-rate">Tổng tỷ lệ trúng thưởng</Label>
                    <span className="font-mono text-xs font-semibold text-primary tabular-nums">
                      {winRate[0]}% (1 trong 4 khách trúng)
                    </span>
                  </div>
                  <Slider
                    id="ds-win-rate"
                    value={winRate}
                    onValueChange={setWinRate}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Mức chống gian lận (EVT-13)</Label>
                  <RadioGroup
                    value={antiFraud}
                    onValueChange={setAntiFraud}
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    <Label
                      htmlFor="af-standard"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/80 p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value="standard" id="af-standard" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          Chuẩn (Mặc định M1)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          SĐT + Thiết bị + Turnstile ẩn
                        </div>
                      </div>
                    </Label>
                    <Label
                      htmlFor="af-strict"
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/80 p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value="strict" id="af-strict" />
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          Nghiêm ngặt (M2 OTP)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Xác thực mã OTP qua SĐT/Zalo
                        </div>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="ds-rules-note">Thể lệ tóm tắt hiển thị ở màn Bìa (CMP-04)</Label>
                  <Textarea
                    id="ds-rules-note"
                    rows={2}
                    defaultValue="Mỗi khách có 1 lượt quay mỗi ngày từ 09:00–22:00. Đổi quà trực tiếp tại quầy trong 7 ngày."
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 p-3">
                  <div className="grid gap-0.5">
                    <Label htmlFor="ds-consent-switch" className="text-xs font-semibold">
                      Tách ô đồng ý nhận ưu đãi lần sau (CMP-02 / G6)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Không gộp chung với điều khoản tham gia chương trình
                    </span>
                  </div>
                  <Switch
                    id="ds-consent-switch"
                    checked={requireConsent}
                    onCheckedChange={setRequireConsent}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="ds-rehearsal-check" defaultChecked />
                  <Label htmlFor="ds-rehearsal-check" className="text-xs font-normal">
                    Cho phép nhân viên quầy tập huấn bằng mã chơi thử trước giờ mở bán (PRZ-19)
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* 4. Navigation, Alerts, Progress, Overlays & Feedback */}
            <div className="grid content-start gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Điều hướng 3 chế độ Builder & Hạn mức gói (Tabs · Progress · Avatar)
                  </CardTitle>
                  <CardDescription>
                    Tabs đồng tâm (khung ngoài <code className="font-mono">rounded-xl</code> 12px,
                    nút trong <code className="font-mono">rounded-lg</code> 8px); Progress cảnh báo
                    hạn mức 80%.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Tabs defaultValue="quick">
                    <TabsList>
                      <TabsTrigger value="quick">1. Sửa nhanh</TabsTrigger>
                      <TabsTrigger value="canvas">2. Tuỳ biến (Canvas)</TabsTrigger>
                      <TabsTrigger value="rules">3. Luật &amp; giải</TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="quick"
                      className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"
                    >
                      Chế độ mặc định cho chủ quán: thay logo, ảnh sản phẩm trà sữa, câu khuyến mãi
                      và đổi skin giữ nguyên nội dung (BLD-19).
                    </TabsContent>
                    <TabsContent
                      value="canvas"
                      className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"
                    >
                      Canvas tự do 5 màn hình: kéo thả, xoay, căn lề snap và khoá lớp (BLD-20).
                    </TabsContent>
                    <TabsContent
                      value="rules"
                      className="mt-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground"
                    >
                      4 bước cấu hình giải thưởng, câu luật tự nhiên, mô phỏng ngân sách và pháp lý
                      (BLD-21).
                    </TabsContent>
                  </Tabs>

                  <div className="grid gap-1.5 rounded-xl border border-border/70 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        Gói Quán · Lượt đổi quà tại quầy tháng này (BIL-02)
                      </span>
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        820 / 1.000 lượt (82%)
                      </span>
                    </div>
                    <Progress value={82} />
                    <span className="text-[11px] text-muted-foreground">
                      Quầy đổi quà không bao giờ bị chặn kể cả khi vượt 100% hạn mức gói (D-23).
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/15 text-xs font-bold text-primary">
                          TH
                        </AvatarFallback>
                      </Avatar>
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
                </CardContent>
              </Card>

              {/* Alerts */}
              <div className="grid gap-2.5">
                <Alert variant="warning">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Còn 1 mục cần kiểm tra trước khi phát hành (BLD-08)</AlertTitle>
                  <AlertDescription className="text-xs">
                    Quà &ldquo;Mua 1 tặng 1 Ô Long&rdquo; chưa có ảnh minh hoạ. Thêm ảnh giúp tỷ lệ
                    khách đổi quà tăng 24%.
                  </AlertDescription>
                </Alert>

                <Alert variant="info">
                  <Info className="size-4" />
                  <AlertTitle>Nhịp phát quà đang nhanh hơn dự kiến 18% (PRZ-22)</AlertTitle>
                  <AlertDescription className="text-xs">
                    Dự báo hết quà sớm 3 ngày trước Mùng 5 Tết. Đề xuất giảm tỷ lệ trúng từ 30%
                    xuống 24%.
                  </AlertDescription>
                </Alert>

                <Alert variant="success">
                  <CheckCircle2 className="size-4" />
                  <AlertTitle>Sẵn sàng mở bán tại 3 điểm bán (BLD-29)</AlertTitle>
                  <AlertDescription className="text-xs">
                    Đã ghép 3 máy quầy và nhân viên đã hoàn tất đổi thử mã tập huấn.
                  </AlertDescription>
                </Alert>
              </div>

              {/* Overlays & Sonner Triggers */}
              <Card className="p-4">
                <div className="mb-2.5 text-xs font-semibold text-foreground">
                  Hộp thoại, Ngăn kéo, Menu & Thông báo (Overlays &amp; Sonner Toast)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Dialog: Pre-flight publish */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Rocket className="size-3.5" />
                        Hộp Phát hành (Dialog)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Kiểm tra trước khi phát hành (BLD-08)</DialogTitle>
                        <DialogDescription>
                          Phiên bản phát hành là bất biến để bảo vệ quyền lợi người chơi và đối soát
                          giải thưởng.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-2.5 py-2 text-xs">
                        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/8 p-3 text-success">
                          <CheckCircle2 className="size-4 shrink-0" />
                          <span>Tổng ngân sách 400 phần quà khớp 1.950.000 ₫ (≤ 2.000.000 ₫).</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/40 p-3 text-foreground">
                          <CheckCircle2 className="size-4 shrink-0 text-primary" />
                          <span>
                            Đã bật thể lệ tự sinh và tách riêng ô đồng ý nhận tin khuyến mãi
                            (CMP-03).
                          </span>
                        </div>
                      </div>
                      <DialogFooter showCloseButton>
                        <Button
                          onClick={() =>
                            toast.success('Đã phát hành chương trình Lộc Xuân Trà Sữa Hà!')
                          }
                        >
                          Xác nhận phát hành
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* AlertDialog: Reopen voucher */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RotateCcw className="size-3.5" />
                        Mở lại mã (AlertDialog)
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mở lại mã PL94K7 đã đổi nhầm? (PRZ-10)</AlertDialogTitle>
                        <AlertDialogDescription>
                          Chỉ Chủ quán (Owner) mới có quyền mở lại mã. Hành động này sẽ được ghi vào
                          Nhật ký kiểm toán (Audit Log ORG-06).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Huỷ</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => toast.info('Đã mở lại mã PL94K7 và ghi Audit Log.')}
                        >
                          Xác nhận mở lại
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Sheet: Player / Play Drawer */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="size-3.5" />
                        Chi tiết khách (Sheet)
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Nguyễn Minh Anh · 090***482</SheetTitle>
                        <SheetDescription>
                          Khách quay lại lần 2 · Đã đồng ý nhận ưu đãi qua Zalo OA.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 grid gap-3 text-xs">
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
                    </SheetContent>
                  </Sheet>

                  {/* Popover: Simulation */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="secondary" size="sm">
                        Mô phỏng 1.000 khách (Popover)
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <PopoverHeader>
                        <PopoverTitle>Kết quả mô phỏng 1.000 lượt (PRZ-08)</PopoverTitle>
                        <PopoverDescription>
                          Chạy thử 500 kịch bản với lưu lượng 80 khách/ngày và cơ chế rải quà theo
                          giờ mở cửa:
                        </PopoverDescription>
                      </PopoverHeader>
                      <div className="mt-3 grid gap-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rủi ro hết quà sớm:</span>
                          <span className="font-semibold text-success">6.2% (An toàn ≤ 10%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chi phí quà dự kiến:</span>
                          <span className="font-mono font-semibold">1.840.000 ₫</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* DropdownMenu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Thao tác
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Quản lý chương trình</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => toast.success('Đã sao chép link ?ch=qr-ban')}
                        >
                          <Copy className="size-4" />
                          Sao chép link QR bàn
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toast.success('Đang tải file Standee A4...')}
                        >
                          <Download className="size-4" />
                          Tải mẫu in Standee &amp; Tent card
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="size-4" />
                        Kết thúc chương trình ngay
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Direct Toast trigger */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toast.success('Đã xác nhận trao quà mã PL94K7!', {
                        description: 'Ghi nhận 1 khách tới quầy tại Cơ sở Nguyễn Huệ.',
                      })
                    }
                  >
                    Thử Toast (Sonner)
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
