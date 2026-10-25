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
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
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
  type BrandColorKey,
  type BrandPalette,
  type ButtonAction,
  type CanvasElement,
  type ColorValue,
  type EnterAnimation,
  IMAGE_PRESETS,
  type ImageElement,
  MAX_ARTBOARD_HEIGHT,
  MIN_ARTBOARD_HEIGHT,
  type PrizeListElement,
  resolveColor,
  type ShapeElement,
  SINGLETON_TYPES,
  type TextElement,
} from '../lib/model';

type ScreenPatch = Extract<EditorAction, { type: 'updateScreen' }>['patch'];

const BRAND_KEYS: BrandColorKey[] = ['primary', 'accent', 'background', 'text', 'surface'];
const ACTIONS: ButtonAction[] = ['start', 'rules', 'link', 'zalo', 'phone', 'next'];
const ANIMATIONS: EnterAnimation[] = ['none', 'fade', 'slideUp', 'zoom', 'bounce'];

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
            <Caption>{t('props.contentHint')}</Caption>
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
          <div className="grid grid-cols-3 gap-2">
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
            ]}
          />
          <Field label={t('props.fill')}>
            <ColorField
              value={element.fill}
              brand={brand}
              onChange={(fill) => update({ fill }, 'fill')}
            />
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
        </Section>
      )}

      {element.type === 'countdown' && (
        <Section title={t('types.countdown')}>
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
          <Field label={t('props.textColor')}>
            <ColorField
              value={element.color}
              brand={brand}
              onChange={(color) => update({ color }, 'color')}
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
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={element.animation.enter}
            onChange={(enter) => update({ animation: { ...element.animation, enter } }, 'anim')}
            options={ANIMATIONS.map((value) => ({ value, label: t(`props.animations.${value}`) }))}
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
