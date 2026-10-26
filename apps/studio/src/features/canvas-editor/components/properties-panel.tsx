'use client';

import {
  Alert,
  Button,
  ColorPicker,
  Divider,
  Flex,
  Input,
  InputNumber,
  Segmented,
  Select,
  Slider,
  Switch,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type Dispatch, type ReactNode, useRef } from 'react';
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
    <Root className="flex flex-col gap-1">
      <Caption>{label}</Caption>
      {children}
    </Root>
  );
}

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Flex vertical gap={12}>
      <Typography.Text strong>{title}</Typography.Text>
      {children}
    </Flex>
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
  const { token } = theme.useToken();
  return (
    <Flex align="center" gap={6} wrap>
      {BRAND_KEYS.map((key) => {
        const ref = `brand.${key}` as const;
        const active = value === ref;
        return (
          <Tooltip key={key} title={`${t('props.brandColors')}: ${t(`brand.${key}`)}`}>
            <button
              type="button"
              aria-label={t(`brand.${key}`)}
              aria-pressed={active}
              onClick={() => onChange(ref)}
              className="size-8 cursor-pointer p-0"
              style={{
                background: brand[key],
                borderRadius: 6,
                border: `2px solid ${active ? token.colorPrimary : token.colorBorder}`,
                boxShadow: active ? `0 0 0 2px ${token.colorPrimaryBg}` : undefined,
              }}
            />
          </Tooltip>
        );
      })}
      <Tooltip title={t('props.custom')}>
        <ColorPicker
          value={resolveColor(value, brand)}
          onChangeComplete={(c) => onChange(c.toHexString() as ColorValue)}
        />
      </Tooltip>
    </Flex>
  );
}

export function PropertiesPanel({
  state,
  dispatch,
  brand,
}: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  brand: BrandPalette;
}) {
  const t = useTranslations('canvasLab');
  const coalescer = useCoalescer();
  const element = selectedElement(state);
  const screen = currentScreen(state);

  if (!element) {
    const setScreen = (patch: ScreenPatch, key: string) =>
      dispatch({ type: 'updateScreen', patch, coalesce: coalescer(key) });
    return (
      <Flex vertical gap={20}>
        <Section title={t('props.screen')}>
          <Typography.Paragraph type="secondary" className="!mb-0">
            {t('props.screenHint')}
          </Typography.Paragraph>
          <Field label={t('props.background')}>
            <ColorField
              value={screen.background.color}
              brand={brand}
              onChange={(color) => setScreen({ background: { ...screen.background, color } }, 'bg')}
            />
          </Field>
          <Field label={t('props.gradientTo')}>
            <Flex align="center" gap={8}>
              <Switch
                checked={Boolean(screen.background.gradientTo)}
                onChange={(on) =>
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
            </Flex>
          </Field>
          <Field label={`${t('props.height')} (${screen.height})`}>
            <Slider
              min={MIN_ARTBOARD_HEIGHT}
              max={MAX_ARTBOARD_HEIGHT}
              value={screen.height}
              onChange={(height) => setScreen({ height }, 'height')}
            />
          </Field>
        </Section>
      </Flex>
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
    <InputNumber
      className="!w-full"
      min={min}
      value={Math.round(element[key] * 10) / 10}
      onChange={(v) => v !== null && update({ [key]: v }, key)}
      prefix={<Caption>{t(`props.${key}`)}</Caption>}
    />
  );

  return (
    <Flex vertical gap={20}>
      <Flex gap={4} justify="flex-end">
        <Tooltip title={t('props.bringFront')}>
          <Button
            size="small"
            type="text"
            aria-label={t('props.bringFront')}
            icon={<ArrowUpToLine className="size-4" />}
            onClick={() =>
              dispatch({ type: 'reorder', id: element.id, toIndex: screen.elements.length - 1 })
            }
            disabled={index === screen.elements.length - 1}
          />
        </Tooltip>
        <Tooltip title={t('props.sendBack')}>
          <Button
            size="small"
            type="text"
            aria-label={t('props.sendBack')}
            icon={<ArrowDownToLine className="size-4" />}
            onClick={() => dispatch({ type: 'reorder', id: element.id, toIndex: 0 })}
            disabled={index === 0}
          />
        </Tooltip>
        <Tooltip title={t('props.duplicate')}>
          <Button
            size="small"
            type="text"
            aria-label={t('props.duplicate')}
            icon={<Copy className="size-4" />}
            disabled={singleton}
            onClick={() => dispatch({ type: 'duplicate', id: element.id })}
          />
        </Tooltip>
        <Tooltip title={t('props.delete')}>
          <Button
            size="small"
            type="text"
            danger
            aria-label={t('props.delete')}
            icon={<Trash2 className="size-4" />}
            disabled={singleton}
            onClick={() => dispatch({ type: 'remove', id: element.id })}
          />
        </Tooltip>
      </Flex>

      <Field bind label={t('props.name')}>
        <Input value={element.name} onChange={(e) => update({ name: e.target.value }, 'name')} />
      </Field>

      {element.type === 'gameStage' && <Alert type="info" showIcon title={t('props.stageHint')} />}
      {element.type === 'form' && <Alert type="info" showIcon title={t('props.formHint')} />}

      <Section title={t('props.layout')}>
        <div className="flex items-center justify-between gap-1 p-1 bg-fill-quaternary rounded-md">
          <Tooltip title={t('props.alignCenterH')}>
            <Button
              size="small"
              type="text"
              icon={<AlignHorizontalJustifyCenter className="size-3.5" />}
              onClick={() =>
                update({ x: Math.round((ARTBOARD_WIDTH - element.w) / 2) }, 'alignCenterX')
              }
            />
          </Tooltip>
          <Tooltip title={t('props.alignCenterV')}>
            <Button
              size="small"
              type="text"
              icon={<AlignVerticalJustifyCenter className="size-3.5" />}
              onClick={() =>
                update({ y: Math.round((screen.height - element.h) / 2) }, 'alignCenterY')
              }
            />
          </Tooltip>
          <Tooltip title={t('props.alignLeft')}>
            <Button
              size="small"
              type="text"
              icon={<AlignLeft className="size-3.5" />}
              onClick={() => update({ x: 16 }, 'alignLeft')}
            />
          </Tooltip>
          <Tooltip title={t('props.alignRight')}>
            <Button
              size="small"
              type="text"
              icon={<AlignRight className="size-3.5" />}
              onClick={() => update({ x: ARTBOARD_WIDTH - element.w - 16 }, 'alignRight')}
            />
          </Tooltip>
          <Tooltip title={t('props.fullWidth')}>
            <Button
              size="small"
              type="text"
              icon={<Maximize2 className="size-3.5" />}
              onClick={() => update({ x: 0, w: ARTBOARD_WIDTH }, 'fullWidth')}
            />
          </Tooltip>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {num('x')}
          {num('y')}
          {num('w', 8)}
          {num('h', 8)}
        </div>
        <Field label={`${t('props.rotation')} (${element.rotation}°)`}>
          <Slider
            min={0}
            max={359}
            value={element.rotation}
            onChange={(rotation) => update({ rotation }, 'rot')}
          />
        </Field>
        <Field label={`${t('props.opacity')} (${Math.round(element.opacity * 100)}%)`}>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={element.opacity}
            onChange={(opacity) => update({ opacity }, 'opacity')}
          />
        </Field>
      </Section>

      <Divider className="!my-0" />

      {element.type === 'text' && (
        <Section title={t('types.text')}>
          <Field bind label={t('props.content')}>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 6 }}
              value={element.content}
              onChange={(e) => update({ content: e.target.value }, 'content')}
            />
            <Flex gap={4} wrap className="mt-1">
              <Caption className="text-xs mr-1">{t('props.insertVariable')}:</Caption>
              {(['{player.name}', '{prize.name}', '{event.name}'] as const).map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => update({ content: `${element.content} ${variable}` }, 'content')}
                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-fill-tertiary hover:bg-fill-secondary cursor-pointer border border-border"
                >
                  +{variable}
                </button>
              ))}
            </Flex>
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
              <InputNumber
                className="!w-full"
                min={8}
                max={120}
                value={element.fontSize}
                onChange={(v) => v && update({ fontSize: v }, 'fontSize')}
              />
            </Field>
            <Field bind label={t('props.lineHeight')}>
              <InputNumber
                className="!w-full"
                min={0.8}
                max={3}
                step={0.05}
                value={element.lineHeight}
                onChange={(v) => v && update({ lineHeight: v }, 'lineHeight')}
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
                  { value: 'left', icon: <AlignLeft className="size-4" />, title: 'left' },
                  { value: 'center', icon: <AlignCenter className="size-4" />, title: 'center' },
                  { value: 'right', icon: <AlignRight className="size-4" />, title: 'right' },
                ]}
              />
            </Field>
            <Field label={t('props.letterSpacing')}>
              <InputNumber
                className="!w-full"
                min={-2}
                max={12}
                step={0.5}
                value={element.letterSpacing ?? 0}
                onChange={(v) => update({ letterSpacing: v ?? 0 }, 'spacing')}
                suffix="px"
              />
            </Field>
          </div>
          <Field label={t('props.textEffect')}>
            <Select
              value={element.textShadow ?? 'none'}
              onChange={(textShadow) => update({ textShadow }, 'shadow')}
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
          <Field bind label={t('props.imageUrl')}>
            <Input
              placeholder={t('props.imageUrlPlaceholder')}
              value={element.src.startsWith('data:') ? '' : element.src}
              onChange={(e) => update({ src: e.target.value }, 'src')}
            />
          </Field>
          <Caption className="text-xs font-semibold mt-1">Stickers / Presets</Caption>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border rounded-md">
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
            <Slider
              min={0}
              max={200}
              value={element.radius}
              onChange={(radius) => update({ radius }, 'radius')}
            />
          </Field>
          <Field label={t('props.boxShadow')}>
            <Select
              value={element.shadow ?? 'none'}
              onChange={(shadow) => update({ shadow }, 'shadow')}
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
              <InputNumber
                className="!w-full"
                min={0}
                max={12}
                value={element.borderWidth ?? 0}
                onChange={(v) => update({ borderWidth: v ?? 0 }, 'borderWidth')}
                suffix="px"
              />
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
            <Select
              value={element.action}
              onChange={(action) => update({ action }, 'action')}
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
            <Select
              value={element.icon ?? 'none'}
              onChange={(icon) => update({ icon }, 'icon')}
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
              <InputNumber
                className="!w-full"
                min={10}
                max={48}
                value={element.fontSize}
                onChange={(v) => v && update({ fontSize: v }, 'fontSize')}
              />
            </Field>
            <Field label={t('props.radius')}>
              <InputNumber
                className="!w-full"
                min={0}
                max={100}
                value={element.radius}
                onChange={(v) => v !== null && update({ radius: v }, 'radius')}
              />
            </Field>
          </div>
          <Field label={t('props.letterSpacing')}>
            <Slider
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
            <Flex align="center" gap={8}>
              <Switch
                checked={Boolean(element.fillGradientTo)}
                onChange={(on) =>
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
            </Flex>
          </Field>
          {element.shape === 'rect' && (
            <Field label={`${t('props.radius')} (${element.radius})`}>
              <Slider
                min={0}
                max={100}
                value={element.radius}
                onChange={(radius) => update({ radius }, 'radius')}
              />
            </Field>
          )}
          <Field label={`${t('props.border')} (${element.borderWidth})`}>
            <Slider
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
            <Select
              value={element.shadow ?? 'none'}
              onChange={(shadow) => update({ shadow }, 'shadow')}
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
            <Select
              value={element.icon}
              onChange={(icon) => update({ icon }, 'badgeIcon')}
              options={BADGE_ICONS.map((value) => ({
                value,
                label: t(`props.badgeIcons.${value}`),
              }))}
            />
          </Field>
          <Flex align="center" justify="space-between">
            <Typography.Text>{t('props.pulseEffect')}</Typography.Text>
            <Switch
              checked={element.pulse ?? false}
              onChange={(pulse) => update({ pulse }, 'pulse')}
            />
          </Flex>
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
              <InputNumber
                className="!w-full"
                min={9}
                max={28}
                value={element.fontSize}
                onChange={(v) => v && update({ fontSize: v }, 'fontSize')}
              />
            </Field>
            <Field label={t('props.radius')}>
              <InputNumber
                className="!w-full"
                min={0}
                max={100}
                value={element.radius}
                onChange={(v) => v !== null && update({ radius: v }, 'radius')}
              />
            </Field>
          </div>
        </Section>
      )}

      {element.type === 'marquee' && (
        <Section title={t('types.marquee')}>
          <Field bind label={t('props.marqueeText')}>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              value={element.text}
              onChange={(e) => update({ text: e.target.value }, 'marqueeText')}
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
            <Select
              value={element.icon}
              onChange={(icon) => update({ icon }, 'marqueeIcon')}
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
            <Select
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
              <Select
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
            <Slider
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
            <Select
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
          <Flex align="center" justify="space-between">
            <Typography.Text>{t('props.showDays')}</Typography.Text>
            <Switch
              checked={element.showDays ?? true}
              onChange={(showDays) => update({ showDays }, 'showDays')}
            />
          </Flex>
          <Flex align="center" justify="space-between">
            <Typography.Text>{t('props.showSeconds')}</Typography.Text>
            <Switch
              checked={element.showSeconds ?? true}
              onChange={(showSeconds) => update({ showSeconds }, 'showSeconds')}
            />
          </Flex>
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
          <Flex align="center" justify="space-between">
            <Typography.Text>{t('props.showRemaining')}</Typography.Text>
            <Switch
              checked={element.showRemaining}
              onChange={(showRemaining) => update({ showRemaining }, 'showRemaining')}
            />
          </Flex>
          <Flex align="center" justify="space-between">
            <Typography.Text>{t('props.cardBorder')}</Typography.Text>
            <Switch
              checked={element.cardBorder ?? true}
              onChange={(cardBorder) => update({ cardBorder }, 'cardBorder')}
            />
          </Flex>
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
            <Select
              value={element.animation.enter}
              onChange={(enter) => update({ animation: { ...element.animation, enter } }, 'anim')}
              options={ANIMATIONS.map((value) => ({
                value,
                label: t(`props.animations.${value}`),
              }))}
            />
            <InputNumber
              className="!w-full"
              min={0}
              max={3000}
              step={100}
              value={element.animation.delayMs}
              onChange={(v) =>
                v !== null && update({ animation: { ...element.animation, delayMs: v } }, 'delay')
              }
              suffix={<Caption>ms</Caption>}
            />
          </div>
        </Field>
        <Field label={t('props.loopAnimation')}>
          <Select
            value={element.animation.loop ?? 'none'}
            onChange={(loop) => update({ animation: { ...element.animation, loop } }, 'loop')}
            options={LOOP_ANIMATIONS.map((value) => ({
              value,
              label: t(`props.loopAnimations.${value}`),
            }))}
          />
        </Field>
      </Section>
    </Flex>
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
  const { token } = theme.useToken();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex aspect-square cursor-pointer items-center justify-center p-2"
      style={{
        borderRadius: token.borderRadius,
        border: `1.5px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`,
        background: token.colorFillQuaternary,
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: built-in data-URL sticker */}
      <img src={src} alt="" className="size-full object-contain" draggable={false} />
    </button>
  );
}
