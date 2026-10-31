import {
  HugeiconsIcon,
  type HugeiconsIconProps,
  type HugeiconsProps,
  type IconSvgElement,
} from '@hugeicons/react';
import { type ForwardRefExoticComponent, forwardRef, type RefAttributes } from 'react';
import {
  HugeActivity,
  HugeAlertCircle,
  HugeAlertTriangle,
  HugeAlignCenter,
  HugeAlignHorizontalJustifyCenterIcon,
  HugeAlignLeft,
  HugeAlignRight,
  HugeAlignVerticalJustifyCenterIcon,
  HugeArrowDown,
  HugeArrowDownToLineIcon,
  HugeArrowLeft,
  HugeArrowRight,
  HugeArrowUp,
  HugeArrowUpDown,
  HugeArrowUpToLineIcon,
  HugeAward,
  HugeBarChart,
  HugeBraces,
  HugeBriefcase,
  HugeBuilding2,
  HugeCalendar,
  HugeCalendarClock,
  HugeCalendarDays,
  HugeCalendarRange,
  HugeCamera,
  HugeCheck,
  HugeCheckIcon,
  HugeCheckmarkCircle02Icon,
  HugeChevronDown,
  HugeChevronDownIcon,
  HugeChevronRightIcon,
  HugeChevronsUpDown,
  HugeChevronUp,
  HugeChevronUpIcon,
  HugeCircleAlert,
  HugeCircleCheck,
  HugeCircleCheckIcon,
  HugeCircleDashed,
  HugeCircleIcon,
  HugeCircleStop,
  HugeCircleX,
  HugeClipboardList,
  HugeClock,
  HugeCloudAlertIcon,
  HugeCloudCheckIcon,
  HugeCoins,
  HugeCopy,
  HugeDownload,
  HugeExternalLink,
  HugeEye,
  HugeEyeOff,
  HugeFileText,
  HugeFilm,
  HugeFlame,
  HugeFrown,
  HugeGamepad2,
  HugeGaugeIcon,
  HugeGem,
  HugeGift,
  HugeGlobe,
  HugeGripVertical,
  HugeHash,
  HugeHelpCircleIcon,
  HugeHome,
  HugeHouse,
  HugeImageIcon,
  HugeImagePlus,
  HugeImageUp,
  HugeInfo,
  HugeInfoIcon,
  HugeLayers,
  HugeLayoutGrid,
  HugeLayoutTemplate,
  HugeLightbulb,
  HugeListOrdered,
  HugeLoaderCircle,
  HugeLoading03Icon,
  HugeLock,
  HugeLogOut,
  HugeMaximize,
  HugeMaximize2,
  HugeMegaphone,
  HugeMenu,
  HugeMessageCircle,
  HugeMinus,
  HugeMoon,
  HugeMoreHorizontal,
  HugeMoreVertical,
  HugeMousePointer,
  HugeMousePointerClick,
  HugeMusic,
  HugeOctagonXIcon,
  HugePalette,
  HugePanelLeft,
  HugePause,
  HugePauseCircleIcon,
  HugePencil,
  HugePencilLine,
  HugePencilRulerIcon,
  HugePercent,
  HugePhone,
  HugePhoneCall,
  HugePlay,
  HugePlus,
  HugePrinter,
  HugeQrCode,
  HugeRadio,
  HugeRedo2,
  HugeRepeat,
  HugeRocket,
  HugeRotateCcw,
  HugeSave,
  HugeScanLine,
  HugeSearch,
  HugeSettings,
  HugeShapes,
  HugeShare,
  HugeShare2,
  HugeShieldCheck,
  HugeShoppingBag,
  HugeSlidersHorizontal,
  HugeSmartphone,
  HugeSparkles,
  HugeSquare,
  HugeStar,
  HugeStore,
  HugeSun,
  HugeTags,
  HugeTarget,
  HugeTicketCheckIcon,
  HugeTrash2,
  HugeTrendingUp,
  HugeTriangleAlertIcon,
  HugeTrophy,
  HugeType,
  HugeUndo2,
  HugeUnlock,
  HugeUpload,
  HugeUserPlus,
  HugeUsers,
  HugeVolume2,
  HugeWallet,
  HugeWandSparkles,
  HugeX,
  HugeXCircle,
  HugeXIcon,
  HugeZap,
  HugeZoomIn,
  HugeZoomOut,
} from './icon-data';

export { HugeiconsIcon, type HugeiconsIconProps, type HugeiconsProps, type IconSvgElement };

export type IconProps = Omit<HugeiconsProps, 'icon'>;
export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
export type LucideIcon = IconComponent;

export function createHugeIcon(iconData: IconSvgElement, displayName: string): IconComponent {
  // biome-ignore lint/correctness/noComponentHookFactories: static module-level Hugeicons wrapper factory
  const Component = forwardRef<SVGSVGElement, IconProps>(
    ({ strokeWidth = 1.75, ...props }, ref) => (
      <HugeiconsIcon ref={ref} icon={iconData} strokeWidth={strokeWidth} {...props} />
    ),
  );
  Component.displayName = displayName;
  return Component;
}

export const Activity = createHugeIcon(HugeActivity, 'Activity');
export const AlertCircle = createHugeIcon(HugeAlertCircle, 'AlertCircle');
export const AlertTriangle = createHugeIcon(HugeAlertTriangle, 'AlertTriangle');
export const AlignCenter = createHugeIcon(HugeAlignCenter, 'AlignCenter');
export const AlignHorizontalJustifyCenter = createHugeIcon(
  HugeAlignHorizontalJustifyCenterIcon,
  'AlignHorizontalJustifyCenter',
);
export const AlignLeft = createHugeIcon(HugeAlignLeft, 'AlignLeft');
export const AlignRight = createHugeIcon(HugeAlignRight, 'AlignRight');
export const AlignVerticalJustifyCenter = createHugeIcon(
  HugeAlignVerticalJustifyCenterIcon,
  'AlignVerticalJustifyCenter',
);
export const ArrowDown = createHugeIcon(HugeArrowDown, 'ArrowDown');
export const ArrowDownToLine = createHugeIcon(HugeArrowDownToLineIcon, 'ArrowDownToLine');
export const ArrowLeft = createHugeIcon(HugeArrowLeft, 'ArrowLeft');
export const ArrowRight = createHugeIcon(HugeArrowRight, 'ArrowRight');
export const ArrowUp = createHugeIcon(HugeArrowUp, 'ArrowUp');
export const ArrowUpDown = createHugeIcon(HugeArrowUpDown, 'ArrowUpDown');
export const ArrowUpToLine = createHugeIcon(HugeArrowUpToLineIcon, 'ArrowUpToLine');
export const Award = createHugeIcon(HugeAward, 'Award');
export const BarChart2 = createHugeIcon(HugeBarChart, 'BarChart2');
export const Braces = createHugeIcon(HugeBraces, 'Braces');
export const Briefcase = createHugeIcon(HugeBriefcase, 'Briefcase');
export const Building2 = createHugeIcon(HugeBuilding2, 'Building2');
export const Calendar = createHugeIcon(HugeCalendar, 'Calendar');
export const CalendarClock = createHugeIcon(HugeCalendarClock, 'CalendarClock');
export const CalendarDays = createHugeIcon(HugeCalendarDays, 'CalendarDays');
export const CalendarRange = createHugeIcon(HugeCalendarRange, 'CalendarRange');
export const Camera = createHugeIcon(HugeCamera, 'Camera');
export const Check = createHugeIcon(HugeCheck, 'Check');
export const CheckCircle2 = createHugeIcon(HugeCheckmarkCircle02Icon, 'CheckCircle2');
export const CheckIcon = createHugeIcon(HugeCheckIcon, 'CheckIcon');
export const ChevronDown = createHugeIcon(HugeChevronDown, 'ChevronDown');
export const ChevronDownIcon = createHugeIcon(HugeChevronDownIcon, 'ChevronDownIcon');
export const ChevronRightIcon = createHugeIcon(HugeChevronRightIcon, 'ChevronRightIcon');
export const ChevronUp = createHugeIcon(HugeChevronUp, 'ChevronUp');
export const ChevronUpIcon = createHugeIcon(HugeChevronUpIcon, 'ChevronUpIcon');
export const ChevronsUpDown = createHugeIcon(HugeChevronsUpDown, 'ChevronsUpDown');
export const CircleAlert = createHugeIcon(HugeCircleAlert, 'CircleAlert');
export const CircleCheck = createHugeIcon(HugeCircleCheck, 'CircleCheck');
export const CircleCheckIcon = createHugeIcon(HugeCircleCheckIcon, 'CircleCheckIcon');
export const CircleDashed = createHugeIcon(HugeCircleDashed, 'CircleDashed');
export const CircleHelp = createHugeIcon(HugeHelpCircleIcon, 'CircleHelp');
export const CircleIcon = createHugeIcon(HugeCircleIcon, 'CircleIcon');
export const CircleStop = createHugeIcon(HugeCircleStop, 'CircleStop');
export const CircleX = createHugeIcon(HugeCircleX, 'CircleX');
export const ClipboardList = createHugeIcon(HugeClipboardList, 'ClipboardList');
export const Clock = createHugeIcon(HugeClock, 'Clock');
export const CloudAlert = createHugeIcon(HugeCloudAlertIcon, 'CloudAlert');
export const CloudCheck = createHugeIcon(HugeCloudCheckIcon, 'CloudCheck');
export const Coins = createHugeIcon(HugeCoins, 'Coins');
export const Copy = createHugeIcon(HugeCopy, 'Copy');
export const Download = createHugeIcon(HugeDownload, 'Download');
export const ExternalLink = createHugeIcon(HugeExternalLink, 'ExternalLink');
export const Eye = createHugeIcon(HugeEye, 'Eye');
export const EyeOff = createHugeIcon(HugeEyeOff, 'EyeOff');
export const FileText = createHugeIcon(HugeFileText, 'FileText');
export const Film = createHugeIcon(HugeFilm, 'Film');
export const Flame = createHugeIcon(HugeFlame, 'Flame');
export const Frown = createHugeIcon(HugeFrown, 'Frown');
export const Gamepad2 = createHugeIcon(HugeGamepad2, 'Gamepad2');
export const Gauge = createHugeIcon(HugeGaugeIcon, 'Gauge');
export const Gem = createHugeIcon(HugeGem, 'Gem');
export const Gift = createHugeIcon(HugeGift, 'Gift');
export const Globe = createHugeIcon(HugeGlobe, 'Globe');
export const GripVertical = createHugeIcon(HugeGripVertical, 'GripVertical');
export const Hash = createHugeIcon(HugeHash, 'Hash');
export const HelpCircle = createHugeIcon(HugeHelpCircleIcon, 'HelpCircle');
export const Home = createHugeIcon(HugeHome, 'Home');
export const House = createHugeIcon(HugeHouse, 'House');
export const ImageIcon = createHugeIcon(HugeImageIcon, 'ImageIcon');
export const ImagePlus = createHugeIcon(HugeImagePlus, 'ImagePlus');
export const ImageUp = createHugeIcon(HugeImageUp, 'ImageUp');
export const Info = createHugeIcon(HugeInfo, 'Info');
export const InfoIcon = createHugeIcon(HugeInfoIcon, 'InfoIcon');
export const Layers = createHugeIcon(HugeLayers, 'Layers');
export const LayoutGrid = createHugeIcon(HugeLayoutGrid, 'LayoutGrid');
export const LayoutTemplate = createHugeIcon(HugeLayoutTemplate, 'LayoutTemplate');
export const Lightbulb = createHugeIcon(HugeLightbulb, 'Lightbulb');
export const ListOrdered = createHugeIcon(HugeListOrdered, 'ListOrdered');
export const Loader2 = createHugeIcon(HugeLoading03Icon, 'Loader2');
export const Loader2Icon = createHugeIcon(HugeLoading03Icon, 'Loader2Icon');
export const LoaderCircle = createHugeIcon(HugeLoaderCircle, 'LoaderCircle');
export const Lock = createHugeIcon(HugeLock, 'Lock');
export const LogOut = createHugeIcon(HugeLogOut, 'LogOut');
export const Maximize = createHugeIcon(HugeMaximize, 'Maximize');
export const Maximize2 = createHugeIcon(HugeMaximize2, 'Maximize2');
export const Megaphone = createHugeIcon(HugeMegaphone, 'Megaphone');
export const Menu = createHugeIcon(HugeMenu, 'Menu');
export const MessageCircle = createHugeIcon(HugeMessageCircle, 'MessageCircle');
export const Minus = createHugeIcon(HugeMinus, 'Minus');
export const Moon = createHugeIcon(HugeMoon, 'Moon');
export const MoreHorizontal = createHugeIcon(HugeMoreHorizontal, 'MoreHorizontal');
export const MoreVertical = createHugeIcon(HugeMoreVertical, 'MoreVertical');
export const MousePointer = createHugeIcon(HugeMousePointer, 'MousePointer');
export const MousePointerClick = createHugeIcon(HugeMousePointerClick, 'MousePointerClick');
export const Music = createHugeIcon(HugeMusic, 'Music');
export const OctagonXIcon = createHugeIcon(HugeOctagonXIcon, 'OctagonXIcon');
export const Palette = createHugeIcon(HugePalette, 'Palette');
export const PanelLeft = createHugeIcon(HugePanelLeft, 'PanelLeft');
export const Pause = createHugeIcon(HugePause, 'Pause');
export const PauseCircle = createHugeIcon(HugePauseCircleIcon, 'PauseCircle');
export const Pencil = createHugeIcon(HugePencil, 'Pencil');
export const PencilLine = createHugeIcon(HugePencilLine, 'PencilLine');
export const PencilRuler = createHugeIcon(HugePencilRulerIcon, 'PencilRuler');
export const Percent = createHugeIcon(HugePercent, 'Percent');
export const Phone = createHugeIcon(HugePhone, 'Phone');
export const PhoneCall = createHugeIcon(HugePhoneCall, 'PhoneCall');
export const Play = createHugeIcon(HugePlay, 'Play');
export const Plus = createHugeIcon(HugePlus, 'Plus');
export const Printer = createHugeIcon(HugePrinter, 'Printer');
export const QrCode = createHugeIcon(HugeQrCode, 'QrCode');
export const Radio = createHugeIcon(HugeRadio, 'Radio');
export const Redo2 = createHugeIcon(HugeRedo2, 'Redo2');
export const Repeat = createHugeIcon(HugeRepeat, 'Repeat');
export const Rocket = createHugeIcon(HugeRocket, 'Rocket');
export const RotateCcw = createHugeIcon(HugeRotateCcw, 'RotateCcw');
export const Save = createHugeIcon(HugeSave, 'Save');
export const ScanLine = createHugeIcon(HugeScanLine, 'ScanLine');
export const Search = createHugeIcon(HugeSearch, 'Search');
export const Settings = createHugeIcon(HugeSettings, 'Settings');
export const Shapes = createHugeIcon(HugeShapes, 'Shapes');
export const Share = createHugeIcon(HugeShare, 'Share');
export const Share2 = createHugeIcon(HugeShare2, 'Share2');
export const ShieldCheck = createHugeIcon(HugeShieldCheck, 'ShieldCheck');
export const ShoppingBag = createHugeIcon(HugeShoppingBag, 'ShoppingBag');
export const SlidersHorizontal = createHugeIcon(HugeSlidersHorizontal, 'SlidersHorizontal');
export const Smartphone = createHugeIcon(HugeSmartphone, 'Smartphone');
export const Sparkles = createHugeIcon(HugeSparkles, 'Sparkles');
export const Square = createHugeIcon(HugeSquare, 'Square');
export const Star = createHugeIcon(HugeStar, 'Star');
export const Store = createHugeIcon(HugeStore, 'Store');
export const Sun = createHugeIcon(HugeSun, 'Sun');
export const Tags = createHugeIcon(HugeTags, 'Tags');
export const Target = createHugeIcon(HugeTarget, 'Target');
export const TicketCheck = createHugeIcon(HugeTicketCheckIcon, 'TicketCheck');
export const Trash2 = createHugeIcon(HugeTrash2, 'Trash2');
export const TrendingUp = createHugeIcon(HugeTrendingUp, 'TrendingUp');
export const TriangleAlert = createHugeIcon(HugeTriangleAlertIcon, 'TriangleAlert');
export const TriangleAlertIcon = createHugeIcon(HugeTriangleAlertIcon, 'TriangleAlertIcon');
export const Trophy = createHugeIcon(HugeTrophy, 'Trophy');
export const Type = createHugeIcon(HugeType, 'Type');
export const Undo2 = createHugeIcon(HugeUndo2, 'Undo2');
export const Unlock = createHugeIcon(HugeUnlock, 'Unlock');
export const Upload = createHugeIcon(HugeUpload, 'Upload');
export const UserPlus = createHugeIcon(HugeUserPlus, 'UserPlus');
export const Users = createHugeIcon(HugeUsers, 'Users');
export const Volume2 = createHugeIcon(HugeVolume2, 'Volume2');
export const Wallet = createHugeIcon(HugeWallet, 'Wallet');
export const Wand2 = createHugeIcon(HugeWandSparkles, 'Wand2');
export const X = createHugeIcon(HugeX, 'X');
export const XCircle = createHugeIcon(HugeXCircle, 'XCircle');
export const XIcon = createHugeIcon(HugeXIcon, 'XIcon');
export const Zap = createHugeIcon(HugeZap, 'Zap');
export const ZoomIn = createHugeIcon(HugeZoomIn, 'ZoomIn');
export const ZoomOut = createHugeIcon(HugeZoomOut, 'ZoomOut');
