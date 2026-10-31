'use client';

import { Alert, AlertTitle } from '@playora/ui/components/alert';
import { Button } from '@playora/ui/components/button';
import { Input } from '@playora/ui/components/input';
import { Separator } from '@playora/ui/components/separator';
import { Slider } from '@playora/ui/components/slider';
import { Switch } from '@playora/ui/components/switch';
import { Textarea } from '@playora/ui/components/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  ImageUp,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type Dispatch, memo, type ReactNode, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Caption } from '@/components/caption';
import {
  currentScreen,
  type EditorAction,
  type EditorState,
  selectedElement,
} from '../lib/editor-state';
import {
  ARTBOARD_WIDTH,
  type BadgeElement,
  type BrandColorKey,
  type BrandPalette,
  type ButtonAction,
  type ButtonElement,
  type CanvasElement,
  type ColorValue,
  type CountdownElement,
  type DividerElement,
  type EnterAnimation,
  IMAGE_PRESETS,
  type ImageElement,
  type LoopAnimation,
  MAX_ARTBOARD_HEIGHT,
  type MarqueeElement,
  MIN_ARTBOARD_HEIGHT,
  type PrizeListElement,
  resolveColor,
  type ShapeElement,
  SINGLETON_TYPES,
  type SocialElement,
  type TextElement,
} from '../lib/model';

type ScreenPatch = Extract<EditorAction, { type: 'updateScreen' }>['patch'];

const BRAND_KEYS: BrandColorKey[] = ['primary', 'accent', 'background', 'text', 'surface'];
const ACTIONS: ButtonAction[] = ['start', 'rules', 'link', 'zalo', 'phone', 'next'];
const ANIMATIONS: EnterAnimation[] = ['none', 'fade', 'slideUp', 'zoom', 'bounce'];
const LOOP_ANIMATIONS: LoopAnimation[] = ['none', 'pulse', 'wiggle', 'float'];
const BUTTON_ICONS = ['none', 'zap', 'gift', 'pointer', 'arrow', 'star'] as const;
const BADGE_ICONS = ['none', 'flame', 'gift', 'sparkles', 'trophy', 'zap', 'star'] as const;
const MARQUEE_ICONS = ['megaphone', 'trophy', 'sparkles', 'flame'] as const;
const ORNAMENTS = ['none', 'star', 'diamond', 'flower'] as const;
const SOCIAL_CHANNELS = ['zalo', 'phone', 'facebook', 'website'] as const;

/** Groups rapid edits to the same field (slider drags, typing) into one undo step. */
function useCoalescer() {
  const last = useRef<{ key: string; at: number } | null>(null);
  return (key: string) => {
    const now = Date.now();
    const coalesce = last.current?.key === key && now - last.current.at < 800;
    last.current = { key, at: now };
    return coalesce;
  };
}

/**
 * Labelled control. `bind` wraps it in a <label> so a single input gets an accessible name; leave
 * it off for groups (colour swatches, Segmented), where a label click would pick the first option.
 */
function Field({
  label,
  children,
  bind,
}: {
  label: ReactNode;
  children: ReactNode;
  bind?: boolean;
}) {
  const Root = bind ? 'label' : 'div';
  return (
    <Root className="flex flex-col gap-1 text-sm">
      <Caption>{label}</Caption>
      {children}
    </Root>
  );
}

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-semibold text-sm">{title}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  block,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label?: React.ReactNode; icon?: React.ReactNode; title?: string }[];
  block?: boolean;
}) {
  return (
    <div
      className={`inline-flex rounded-full border border-border bg-muted/50 p-0.5 text-xs ${
        block ? 'w-full' : ''
      }`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors ${
              active
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.icon}
            {opt.label && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function PropSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function PropSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => v !== undefined && onChange(v)}
      className="my-1"
    />
  );
}

function ColorField({
  value,
  brand,
  onChange,
}: {
  value: ColorValue;
  brand: BrandPalette;
  onChange: (value: ColorValue) => void;
}) {
  const t = useTranslations('canvasLab');
  const resolved = resolveColor(value, brand);
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1.5">
        {BRAND_KEYS.map((key) => {
          const ref = `brand.${key}` as const;
          const active = value === ref;
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t(`brand.${key}`)}
                  aria-pressed={active}
                  onClick={() => onChange(ref)}
                  className={`size-7 cursor-pointer rounded-lg border transition-all ${
                    active ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                  }`}
                  style={{ background: brand[key] }}
                />
              </TooltipTrigger>
              <TooltipContent>{`${t('props.brandColors')}: ${t(`brand.${key}`)}`}</TooltipContent>
            </Tooltip>
          );
        })}
        <input
          type="color"
          value={
            resolved.startsWith('#') && (resolved.length === 7 || resolved.length === 4)
              ? resolved
              : '#000000'
          }
          onChange={(e) => onChange(e.target.value as ColorValue)}
          className="size-7 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
          title={t('props.custom')}
        />
      </div>
    </TooltipProvider>
  );
}

function PropertiesPanelView({
  state,
  dispatch,
  brand,
  onUploadImage,
}: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  brand: BrandPalette;
  onUploadImage?: (file: File) => Promise<string>;
}) {
  const t = useTranslations('canvasLab');
  const tQuickEdit = useTranslations('builderLab.quickEdit');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coalescer = useCoalescer();
  const element = selectedElement(state);
  const screen = currentScreen(state);

  if (!element) {
    const setScreen = (patch: ScreenPatch, key: string) =>
      dispatch({ type: 'updateScreen', patch, coalesce: coalescer(key) });
    return (
      <div className="flex flex-col gap-5">
        <Section title={t('props.screen')}>
          <p className="text-muted-foreground text-xs">{t('props.screenHint')}</p>
          <Field label={t('props.background')}>
            <ColorField
              value={screen.background.color}
              brand={brand}
              onChange={(color) => setScreen({ background: { ...screen.background, color } }, 'bg')}
            />
          </Field>
          <Field label={t('props.gradientTo')}>
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(screen.background.gradientTo)}
                onCheckedChange={(on) =>
                  setScreen(
                    {
                      background: {
                        ...screen.background,
                        gradientTo: on ? 'brand.primary' : undefined,
                      },
                    },
                    'gradientToggle',
                  )
                }
              />
              {screen.background.gradientTo ? (
                <ColorField
                  value={screen.background.gradientTo}
                  brand={brand}
                  onChange={(gradientTo) =>
                    setScreen({ background: { ...screen.background, gradientTo } }, 'grad')
                  }
                />
              ) : (
                <Caption>{t('props.noGradient')}</Caption>
              )}
            </div>
          </Field>
          <Field label={`${t('props.height')} (${screen.height})`}>
            <PropSlider
              min={MIN_ARTBOARD_HEIGHT}
              max={MAX_ARTBOARD_HEIGHT}
              value={screen.height}
              onChange={(height) => setScreen({ height }, 'height')}
            />
          </Field>
        </Section>
      </div>
    );
  }

  const update = (patch: Partial<CanvasElement>, key: string) =>
    dispatch({
      type: 'update',
      id: element.id,
      patch,
      coalesce: coalescer(`${element.id}:${key}`),
    });

  const singleton = SINGLETON_TYPES.includes(element.type);
  const index = screen.elements.findIndex((e) => e.id === element.id);
  const num = (key: 'x' | 'y' | 'w' | 'h' | 'rotation', min?: number) => (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-2 text-[10px] text-muted-foreground uppercase font-semibold">
        {t(`props.${key}`)}
      </span>
      <Input
        type="number"
        min={min}
        step={key === 'rotation' ? 1 : 1}
        className="pl-8 text-right font-mono text-xs"
        value={Math.round(element[key] * 10) / 10}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) update({ [key]: v }, key);
        }}
      />
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-5">
        <div className="flex justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 rounded-full"
                aria-label={t('props.bringFront')}
                onClick={() =>
                  dispatch({ type: 'reorder', id: element.id, toIndex: screen.elements.length - 1 })
                }
                disabled={index === screen.elements.length - 1}
              >
                <ArrowUpToLine className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('props.bringFront')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 rounded-full"
                aria-label={t('props.sendBack')}
                onClick={() => dispatch({ type: 'reorder', id: element.id, toIndex: 0 })}
                disabled={index === 0}
              >
                <ArrowDownToLine className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('props.sendBack')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 rounded-full"
                aria-label={t('props.duplicate')}
                disabled={singleton}
                onClick={() => dispatch({ type: 'duplicate', id: element.id })}
              >
                <Copy className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('props.duplicate')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={t('props.delete')}
                disabled={singleton}
                onClick={() => dispatch({ type: 'remove', id: element.id })}
              >
                <Trash2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('props.delete')}</TooltipContent>
          </Tooltip>
        </div>

        <Field bind label={t('props.name')}>
          <Input value={element.name} onChange={(e) => update({ name: e.target.value }, 'name')} />
        </Field>

        {element.type === 'gameStage' && (
          <Alert>
            <AlertTitle>{t('props.stageHint')}</AlertTitle>
          </Alert>
        )}
        {element.type === 'form' && (
          <Alert>
            <AlertTitle>{t('props.formHint')}</AlertTitle>
          </Alert>
        )}

        <Section title={t('props.layout')}>
          <div className="flex items-center justify-between gap-1 rounded-xl border bg-muted/30 p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-lg"
                  onClick={() =>
                    update({ x: Math.round((ARTBOARD_WIDTH - element.w) / 2) }, 'alignCenterX')
                  }
                >
                  <AlignHorizontalJustifyCenter className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('props.alignCenterH')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-lg"
                  onClick={() =>
                    update({ y: Math.round((screen.height - element.h) / 2) }, 'alignCenterY')
                  }
                >
                  <AlignVerticalJustifyCenter className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('props.alignCenterV')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-lg"
                  onClick={() => update({ x: 16 }, 'alignLeft')}
                >
                  <AlignLeft className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('props.alignLeft')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-lg"
                  onClick={() => update({ x: ARTBOARD_WIDTH - element.w - 16 }, 'alignRight')}
                >
                  <AlignRight className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('props.alignRight')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-lg"
                  onClick={() => update({ x: 0, w: ARTBOARD_WIDTH }, 'fullWidth')}
                >
                  <Maximize2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('props.fullWidth')}</TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {num('x')}
            {num('y')}
            {num('w', 8)}
            {num('h', 8)}
          </div>
          <Field label={`${t('props.rotation')} (${element.rotation}°)`}>
            <PropSlider
              min={0}
              max={359}
              value={element.rotation}
              onChange={(rotation) => update({ rotation }, 'rot')}
            />
          </Field>
          <Field label={`${t('props.opacity')} (${Math.round(element.opacity * 100)}%)`}>
            <PropSlider
              min={0}
              max={1}
              step={0.05}
              value={element.opacity}
              onChange={(opacity) => update({ opacity }, 'opacity')}
            />
          </Field>
        </Section>

        <Separator />

        {element.type === 'text' && (
          <Section title={t('types.text')}>
            <Field bind label={t('props.content')}>
              <Textarea
                rows={3}
                value={element.content}
                onChange={(e) => update({ content: e.target.value }, 'content')}
                className="resize-none"
              />
              <div className="flex flex-wrap items-center gap-1 mt-1">
                <Caption className="text-xs mr-1">{t('props.insertVariable')}:</Caption>
                {(['{player.name}', '{prize.name}', '{event.name}'] as const).map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => update({ content: `${element.content} ${variable}` }, 'content')}
                    className="text-xs font-mono px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 cursor-pointer border border-border"
                  >
                    +{variable}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t('props.font')}>
              <Segmented
                block
                value={element.font}
                onChange={(font) => update({ font: font as TextElement['font'] }, 'font')}
                options={[
                  { value: 'heading', label: t('props.fontHeading') },
                  { value: 'body', label: t('props.fontBody') },
                ]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field bind label={t('props.fontSize')}>
                <Input
                  type="number"
                  min={8}
                  max={120}
                  value={element.fontSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) update({ fontSize: v }, 'fontSize');
                  }}
                  className="font-mono text-xs"
                />
              </Field>
              <Field bind label={t('props.lineHeight')}>
                <Input
                  type="number"
                  min={0.8}
                  max={3}
                  step={0.05}
                  value={element.lineHeight}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) update({ lineHeight: v }, 'lineHeight');
                  }}
                  className="font-mono text-xs"
                />
              </Field>
            </div>
            <Field label={t('props.fontWeight')}>
              <Segmented
                block
                value={element.fontWeight}
                onChange={(fontWeight) =>
                  update({ fontWeight: fontWeight as TextElement['fontWeight'] }, 'weight')
                }
                options={[
                  { value: 400, label: t('props.weightRegular') },
                  { value: 600, label: t('props.weightSemibold') },
                  { value: 800, label: t('props.weightBold') },
                ]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('props.align')}>
                <Segmented
                  value={element.align}
                  onChange={(align) => update({ align: align as TextElement['align'] }, 'align')}
                  options={[
                    { value: 'left', icon: <AlignLeft className="size-3.5" />, title: 'left' },
                    {
                      value: 'center',
                      icon: <AlignCenter className="size-3.5" />,
                      title: 'center',
                    },
                    { value: 'right', icon: <AlignRight className="size-3.5" />, title: 'right' },
                  ]}
                />
              </Field>
              <Field label={t('props.letterSpacing')}>
                <div className="relative">
                  <Input
                    type="number"
                    min={-2}
                    max={12}
                    step={0.5}
                    value={element.letterSpacing ?? 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v)) update({ letterSpacing: v }, 'spacing');
                    }}
                    className="pr-6 font-mono text-xs"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    px
                  </span>
                </div>
              </Field>
            </div>
            <Field label={t('props.textEffect')}>
              <PropSelect
                value={element.textShadow ?? 'none'}
                onChange={(textShadow) =>
                  update({ textShadow: textShadow as TextElement['textShadow'] }, 'shadow')
                }
                options={[
                  { value: 'none', label: t('props.textEffects.none') },
                  { value: 'soft', label: t('props.textEffects.soft') },
                  { value: 'retro3d', label: t('props.textEffects.retro3d') },
                  { value: 'glow', label: t('props.textEffects.glow') },
                  { value: 'outline', label: t('props.textEffects.outline') },
                ]}
              />
            </Field>
            <Field label={t('props.textTransform')}>
              <Segmented
                block
                value={element.textTransform ?? 'none'}
                onChange={(textTransform) =>
                  update(
                    { textTransform: textTransform as TextElement['textTransform'] },
                    'transform',
                  )
                }
                options={[
                  { value: 'none', label: t('props.transforms.none') },
                  { value: 'uppercase', label: t('props.transforms.uppercase') },
                  { value: 'capitalize', label: t('props.transforms.capitalize') },
                ]}
              />
            </Field>
            <Field label={t('props.color')}>
              <ColorField
                value={element.color}
                brand={brand}
                onChange={(color) => update({ color }, 'color')}
              />
            </Field>
          </Section>
        )}

        {element.type === 'image' && (
          <Section title={t('props.image')}>
            {onUploadImage && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error(tQuickEdit('tooLarge'));
                      return;
                    }
                    setUploadingImage(true);
                    try {
                      const url = await onUploadImage(file);
                      update({ src: url }, 'src');
                    } catch {
                      toast.error(tQuickEdit('uploadFailed'));
                    } finally {
                      setUploadingImage(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-full"
                >
                  <ImageUp className="mr-1.5 size-4" />
                  {tQuickEdit('upload')}
                </Button>
              </div>
            )}
            <Field bind label={t('props.imageUrl')}>
              <Input
                placeholder={t('props.imageUrlPlaceholder')}
                value={element.src.startsWith('data:') ? '' : element.src}
                onChange={(e) => {
                  const next = e.target.value;
                  if (!next.startsWith('data:')) update({ src: next }, 'src');
                }}
              />
            </Field>
            <Caption className="text-xs font-semibold mt-1">Stickers / Presets</Caption>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border rounded-xl">
              {IMAGE_PRESETS.map((preset) => (
                <PresetTile
                  key={preset.key}
                  src={preset.src}
                  active={element.src === preset.src}
                  onClick={() => update({ src: preset.src }, 'src')}
                />
              ))}
            </div>
            <Field label={t('props.fit')}>
              <Segmented
                block
                value={element.fit}
                onChange={(fit) => update({ fit: fit as ImageElement['fit'] }, 'fit')}
                options={[
                  { value: 'contain', label: t('props.fitContain') },
                  { value: 'cover', label: t('props.fitCover') },
                ]}
              />
            </Field>
            <Field label={`${t('props.radius')} (${element.radius})`}>
              <PropSlider
                min={0}
                max={200}
                value={element.radius}
                onChange={(radius) => update({ radius }, 'radius')}
              />
            </Field>
            <Field label={t('props.boxShadow')}>
              <PropSelect
                value={element.shadow ?? 'none'}
                onChange={(shadow) =>
                  update({ shadow: shadow as ImageElement['shadow'] }, 'shadow')
                }
                options={[
                  { value: 'none', label: t('props.shadows.none') },
                  { value: 'soft', label: t('props.shadows.soft') },
                  { value: 'strong', label: t('props.shadows.strong') },
                  { value: 'glow', label: t('props.shadows.glow') },
                ]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('props.border')}>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    value={element.borderWidth ?? 0}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v)) update({ borderWidth: v }, 'borderWidth');
                    }}
                    className="pr-6 font-mono text-xs"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    px
                  </span>
                </div>
              </Field>
              {Boolean(element.borderWidth) && (
                <Field label={t('props.borderColor')}>
                  <ColorField
                    value={element.borderColor ?? 'brand.accent'}
                    brand={brand}
                    onChange={(borderColor) => update({ borderColor }, 'borderColor')}
                  />
                </Field>
              )}
            </div>
          </Section>
        )}

        {element.type === 'button' && (
          <Section title={t('types.button')}>
            <Field bind label={t('props.label')}>
              <Input
                value={element.label}
                onChange={(e) => update({ label: e.target.value }, 'label')}
              />
            </Field>
            <Field bind label={t('props.action')}>
              <PropSelect
                value={element.action}
                onChange={(action) => update({ action: action as ButtonAction }, 'action')}
                options={ACTIONS.map((value) => ({ value, label: t(`props.actions.${value}`) }))}
              />
            </Field>
            {(element.action === 'link' ||
              element.action === 'zalo' ||
              element.action === 'phone') && (
              <Field bind label={t('props.actionTarget')}>
                <Input
                  placeholder={t('props.actionTargetHint')}
                  value={element.actionTarget ?? ''}
                  onChange={(e) => update({ actionTarget: e.target.value }, 'actionTarget')}
                />
              </Field>
            )}
            <Field label={t('props.buttonStyle')}>
              <Segmented
                block
                value={element.variant ?? 'game3d'}
                onChange={(variant) =>
                  update({ variant: variant as ButtonElement['variant'] }, 'variant')
                }
                options={[
                  { value: 'game3d', label: t('props.buttonStyles.game3d') },
                  { value: 'flat', label: t('props.buttonStyles.flat') },
                  { value: 'glow', label: t('props.buttonStyles.glow') },
                  { value: 'gradient', label: t('props.buttonStyles.gradient') },
                ]}
              />
            </Field>
            <Field label={t('props.buttonIcon')}>
              <PropSelect
                value={element.icon ?? 'none'}
                onChange={(icon) => update({ icon: icon as any }, 'icon')}
                options={BUTTON_ICONS.map((value) => ({
                  value,
                  label: t(`props.buttonIcons.${value}`),
                }))}
              />
            </Field>
            <Field label={t('props.fill')}>
              <ColorField
                value={element.background}
                brand={brand}
                onChange={(background) => update({ background }, 'bg')}
              />
            </Field>
            <Field label={t('props.textColor')}>
              <ColorField
                value={element.color}
                brand={brand}
                onChange={(color) => update({ color }, 'color')}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field bind label={t('props.fontSize')}>
                <Input
                  type="number"
                  min={10}
                  max={48}
                  value={element.fontSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) update({ fontSize: v }, 'fontSize');
                  }}
                  className="font-mono text-xs"
                />
              </Field>
              <Field label={t('props.radius')}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={element.radius}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) update({ radius: v }, 'radius');
                  }}
                  className="font-mono text-xs"
                />
              </Field>
            </div>
            <Field label={t('props.letterSpacing')}>
              <PropSlider
                min={-1}
                max={6}
                step={0.5}
                value={element.letterSpacing ?? 0.5}
                onChange={(v) => update({ letterSpacing: v }, 'spacing')}
              />
            </Field>
          </Section>
        )}

        {element.type === 'shape' && (
          <Section title={t('types.shape')}>
            <Segmented
              block
              value={element.shape}
              onChange={(shape) => update({ shape: shape as ShapeElement['shape'] }, 'shape')}
              options={[
                { value: 'rect', label: t('props.rect') },
                { value: 'ellipse', label: t('props.ellipse') },
                { value: 'pill', label: t('props.shapeStyles.pill') },
                { value: 'card', label: t('props.shapeStyles.card') },
              ]}
            />
            <Field label={t('props.fill')}>
              <ColorField
                value={element.fill}
                brand={brand}
                onChange={(fill) => update({ fill }, 'fill')}
              />
            </Field>
            <Field label={t('props.fillGradient')}>
              <div className="flex items-center gap-2">
                <Switch
                  checked={Boolean(element.fillGradientTo)}
                  onCheckedChange={(on) =>
                    update({ fillGradientTo: on ? 'brand.primary' : undefined }, 'gradientToggle')
                  }
                />
                {element.fillGradientTo ? (
                  <ColorField
                    value={element.fillGradientTo}
                    brand={brand}
                    onChange={(fillGradientTo) => update({ fillGradientTo }, 'gradTo')}
                  />
                ) : (
                  <Caption>{t('props.noGradient')}</Caption>
                )}
              </div>
            </Field>
            {element.shape === 'rect' && (
              <Field label={`${t('props.radius')} (${element.radius})`}>
                <PropSlider
                  min={0}
                  max={100}
                  value={element.radius}
                  onChange={(radius) => update({ radius }, 'radius')}
                />
              </Field>
            )}
            <Field label={`${t('props.border')} (${element.borderWidth})`}>
              <PropSlider
                min={0}
                max={12}
                value={element.borderWidth}
                onChange={(borderWidth) => update({ borderWidth }, 'borderWidth')}
              />
            </Field>
            {element.borderWidth > 0 && (
              <Field label={t('props.borderColor')}>
                <ColorField
                  value={element.borderColor}
                  brand={brand}
                  onChange={(borderColor) => update({ borderColor }, 'borderColor')}
                />
              </Field>
            )}
            <Field label={t('props.boxShadow')}>
              <PropSelect
                value={element.shadow ?? 'none'}
                onChange={(shadow) =>
                  update({ shadow: shadow as ImageElement['shadow'] }, 'shadow')
                }
                options={[
                  { value: 'none', label: t('props.shadows.none') },
                  { value: 'soft', label: t('props.shadows.soft') },
                  { value: 'card', label: t('props.shadows.card') },
                  { value: 'glow', label: t('props.shadows.glow') },
                ]}
              />
            </Field>
          </Section>
        )}

        {element.type === 'badge' && (
          <Section title={t('types.badge')}>
            <Field bind label={t('props.badgeText')}>
              <Input
                value={element.text}
                onChange={(e) => update({ text: e.target.value }, 'badgeText')}
              />
            </Field>
            <Field label={t('props.badgeVariant')}>
              <Segmented
                block
                value={element.variant}
                onChange={(variant) =>
                  update({ variant: variant as BadgeElement['variant'] }, 'badgeVariant')
                }
                options={[
                  { value: 'filled', label: t('props.badgeVariants.filled') },
                  { value: 'outline', label: t('props.badgeVariants.outline') },
                  { value: 'gradient', label: t('props.badgeVariants.gradient') },
                ]}
              />
            </Field>
            <Field label={t('props.badgeIcon')}>
              <PropSelect
                value={element.icon}
                onChange={(icon) => update({ icon: icon as any }, 'badgeIcon')}
                options={BADGE_ICONS.map((value) => ({
                  value,
                  label: t(`props.badgeIcons.${value}`),
                }))}
              />
            </Field>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('props.pulseEffect')}</span>
              <Switch
                checked={element.pulse ?? false}
                onCheckedChange={(pulse) => update({ pulse }, 'pulse')}
              />
            </div>
            <Field label={t('props.fill')}>
              <ColorField
                value={element.background}
                brand={brand}
                onChange={(background) => update({ background }, 'bg')}
              />
            </Field>
            <Field label={t('props.textColor')}>
              <ColorField
                value={element.color}
                brand={brand}
                onChange={(color) => update({ color }, 'color')}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field bind label={t('props.fontSize')}>
                <Input
                  type="number"
                  min={9}
                  max={28}
                  value={element.fontSize}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) update({ fontSize: v }, 'fontSize');
                  }}
                  className="font-mono text-xs"
                />
              </Field>
              <Field label={t('props.radius')}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={element.radius}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) update({ radius: v }, 'radius');
                  }}
                  className="font-mono text-xs"
                />
              </Field>
            </div>
          </Section>
        )}

        {element.type === 'marquee' && (
          <Section title={t('types.marquee')}>
            <Field bind label={t('props.marqueeText')}>
              <Textarea
                rows={2}
                value={element.text}
                onChange={(e) => update({ text: e.target.value }, 'marqueeText')}
                className="resize-none"
              />
            </Field>
            <Field label={t('props.marqueeSpeed')}>
              <Segmented
                block
                value={element.speed}
                onChange={(speed) =>
                  update({ speed: speed as MarqueeElement['speed'] }, 'marqueeSpeed')
                }
                options={[
                  { value: 'slow', label: t('props.speeds.slow') },
                  { value: 'normal', label: t('props.speeds.normal') },
                  { value: 'fast', label: t('props.speeds.fast') },
                ]}
              />
            </Field>
            <Field label={t('props.marqueeIcon')}>
              <PropSelect
                value={element.icon}
                onChange={(icon) => update({ icon: icon as any }, 'marqueeIcon')}
                options={MARQUEE_ICONS.map((value) => ({
                  value,
                  label: t(`props.marqueeIcons.${value}`),
                }))}
              />
            </Field>
            <Field label={t('props.fill')}>
              <ColorField
                value={element.background}
                brand={brand}
                onChange={(background) => update({ background }, 'bg')}
              />
            </Field>
            <Field label={t('props.textColor')}>
              <ColorField
                value={element.color}
                brand={brand}
                onChange={(color) => update({ color }, 'color')}
              />
            </Field>
          </Section>
        )}

        {element.type === 'divider' && (
          <Section title={t('types.divider')}>
            <Field label={t('props.dividerStyle')}>
              <PropSelect
                value={element.style}
                onChange={(style) =>
                  update({ style: style as DividerElement['style'] }, 'dividerStyle')
                }
                options={[
                  { value: 'solid', label: t('props.dividerStyles.solid') },
                  { value: 'dashed', label: t('props.dividerStyles.dashed') },
                  { value: 'dotted', label: t('props.dividerStyles.dotted') },
                  { value: 'gradient', label: t('props.dividerStyles.gradient') },
                  { value: 'ornament', label: t('props.dividerStyles.ornament') },
                ]}
              />
            </Field>
            {element.style === 'ornament' && (
              <Field label={t('props.ornament')}>
                <PropSelect
                  value={element.ornament}
                  onChange={(ornament) =>
                    update({ ornament: ornament as DividerElement['ornament'] }, 'ornament')
                  }
                  options={ORNAMENTS.map((value) => ({
                    value,
                    label: t(`props.ornaments.${value}`),
                  }))}
                />
              </Field>
            )}
            <Field label={t('props.color')}>
              <ColorField
                value={element.color}
                brand={brand}
                onChange={(color) => update({ color }, 'color')}
              />
            </Field>
            <Field label={t('props.thickness')}>
              <PropSlider
                min={1}
                max={8}
                value={element.thickness}
                onChange={(thickness) => update({ thickness }, 'thickness')}
              />
            </Field>
          </Section>
        )}

        {element.type === 'audio' && (
          <Section title={t('types.audio')}>
            <Field bind label={t('props.audioLabel')}>
              <Input
                placeholder="VD: Bật âm thanh (hoặc để trống)"
                value={element.label ?? ''}
                onChange={(e) => update({ label: e.target.value }, 'audioLabel')}
              />
            </Field>
            <Field label={t('props.fill')}>
              <ColorField
                value={element.background}
                brand={brand}
                onChange={(background) => update({ background }, 'bg')}
              />
            </Field>
            <Field label={t('props.color')}>
              <ColorField
                value={element.color}
                brand={brand}
                onChange={(color) => update({ color }, 'color')}
              />
            </Field>
          </Section>
        )}

        {element.type === 'social' && (
          <Section title={t('types.social')}>
            <Field label={t('props.socialChannel')}>
              <PropSelect
                value={element.channel}
                onChange={(channel) =>
                  update({ channel: channel as SocialElement['channel'] }, 'socialChannel')
                }
                options={SOCIAL_CHANNELS.map((value) => ({
                  value,
                  label: t(`props.socialChannels.${value}`),
                }))}
              />
            </Field>
            <Field bind label={t('props.label')}>
              <Input
                value={element.label}
                onChange={(e) => update({ label: e.target.value }, 'socialLabel')}
              />
            </Field>
            <Field bind label={t('props.socialUrl')}>
              <Input
                placeholder="VD: https://zalo.me/... hoặc 19006868"
                value={element.url ?? ''}
                onChange={(e) => update({ url: e.target.value }, 'socialUrl')}
              />
            </Field>
            <Field label={t('props.fill')}>
              <ColorField
                value={element.background}
                brand={brand}
                onChange={(background) => update({ background }, 'bg')}
              />
            </Field>
            <Field label={t('props.textColor')}>
              <ColorField
                value={element.color}
                brand={brand}
                onChange={(color) => update({ color }, 'color')}
              />
            </Field>
          </Section>
        )}

        {element.type === 'countdown' && (
          <Section title={t('types.countdown')}>
            <Field bind label={t('props.countdownTitle')}>
              <Input
                value={element.title ?? ''}
                placeholder="VD: ƯU ĐÃI KẾT THÚC SAU"
                onChange={(e) => update({ title: e.target.value }, 'title')}
              />
            </Field>
            <Field label={t('props.countdownVariant')}>
              <Segmented
                block
                value={element.variant ?? 'cards'}
                onChange={(variant) =>
                  update({ variant: variant as CountdownElement['variant'] }, 'variant')
                }
                options={[
                  { value: 'cards', label: t('props.countdownVariants.cards') },
                  { value: 'pill', label: t('props.countdownVariants.pill') },
                  { value: 'minimal', label: t('props.countdownVariants.minimal') },
                ]}
              />
            </Field>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('props.showDays')}</span>
              <Switch
                checked={element.showDays ?? true}
                onCheckedChange={(showDays) => update({ showDays }, 'showDays')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('props.showSeconds')}</span>
              <Switch
                checked={element.showSeconds ?? true}
                onCheckedChange={(showSeconds) => update({ showSeconds }, 'showSeconds')}
              />
            </div>
            <Field label={t('props.textColor')}>
              <ColorField
                value={element.color}
                brand={brand}
                onChange={(color) => update({ color }, 'color')}
              />
            </Field>
            <Field label={t('props.fill')}>
              <ColorField
                value={element.background}
                brand={brand}
                onChange={(background) => update({ background }, 'bg')}
              />
            </Field>
          </Section>
        )}

        {element.type === 'prizeList' && (
          <Section title={t('types.prizeList')}>
            <Field bind label={t('props.prizeListTitle')}>
              <Input
                value={element.title ?? ''}
                placeholder="VD: CƠ CẤU GIẢI THƯỞNG"
                onChange={(e) => update({ title: e.target.value }, 'title')}
              />
            </Field>
            <Field label={t('props.prizeLayout')}>
              <Segmented
                block
                value={element.layout}
                onChange={(layout) =>
                  update({ layout: layout as PrizeListElement['layout'] }, 'layout')
                }
                options={[
                  { value: 'grid', label: t('props.grid') },
                  { value: 'list', label: t('props.list') },
                ]}
              />
            </Field>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('props.showRemaining')}</span>
              <Switch
                checked={element.showRemaining}
                onCheckedChange={(showRemaining) => update({ showRemaining }, 'showRemaining')}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('props.cardBorder')}</span>
              <Switch
                checked={element.cardBorder ?? true}
                onCheckedChange={(cardBorder) => update({ cardBorder }, 'cardBorder')}
              />
            </div>
            <Field label={t('props.textColor')}>
              <ColorField
                value={element.color}
                brand={brand}
                onChange={(color) => update({ color }, 'color')}
              />
            </Field>
            <Field label={t('props.cardBackground')}>
              <ColorField
                value={element.cardBackground ?? 'brand.surface'}
                brand={brand}
                onChange={(cardBackground) => update({ cardBackground }, 'cardBackground')}
              />
            </Field>
          </Section>
        )}

        {element.type === 'form' && (
          <Field label={t('props.textColor')}>
            <ColorField
              value={element.color}
              brand={brand}
              onChange={(color) => update({ color }, 'color')}
            />
          </Field>
        )}

        <Section title={t('props.animation')}>
          <Field label={t('props.animationEnter')}>
            <div className="grid grid-cols-2 gap-2">
              <PropSelect
                value={element.animation.enter}
                onChange={(enter) =>
                  update({ animation: { ...element.animation, enter: enter as any } }, 'anim')
                }
                options={ANIMATIONS.map((value) => ({
                  value,
                  label: t(`props.animations.${value}`),
                }))}
              />
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={3000}
                  step={100}
                  value={element.animation.delayMs}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) {
                      update({ animation: { ...element.animation, delayMs: v } }, 'delay');
                    }
                  }}
                  className="pr-8 font-mono text-xs"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  ms
                </span>
              </div>
            </div>
          </Field>
          <Field label={t('props.loopAnimation')}>
            <PropSelect
              value={element.animation.loop ?? 'none'}
              onChange={(loop) =>
                update({ animation: { ...element.animation, loop: loop as any } }, 'loop')
              }
              options={LOOP_ANIMATIONS.map((value) => ({
                value,
                label: t(`props.loopAnimations.${value}`),
              }))}
            />
          </Field>
        </Section>
      </div>
    </TooltipProvider>
  );
}

function PresetTile({
  src,
  active,
  onClick,
}: {
  src: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex aspect-square cursor-pointer items-center justify-center rounded-lg border p-1.5 transition-colors ${
        active
          ? 'border-primary ring-2 ring-primary/20 bg-muted/60'
          : 'border-border bg-muted/20 hover:border-foreground/30'
      }`}
    >
      {/* biome-ignore lint/performance/noImgElement: built-in data-URL sticker */}
      <img src={src} alt="" className="size-full object-contain" draggable={false} />
    </button>
  );
}

/** Memoized: re-renders only when the editor state changes, not on zoom or parent sync. */
export const PropertiesPanel = memo(PropertiesPanelView);
