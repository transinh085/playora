'use client';

import { Button, Flex, Menu, Tooltip, Typography, theme } from 'antd';
import {
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  Frown,
  Gamepad2,
  Gift,
  GripVertical,
  Home,
  ImageIcon,
  Lock,
  MousePointerClick,
  Shapes,
  Trophy,
  Type,
  Unlock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type Dispatch, useState } from 'react';
import { Caption } from '@/components/caption';
import { IconTile } from '@/components/icon-tile';
import { currentScreen, type EditorAction, type EditorState } from '../lib/editor-state';
import {
  ADDABLE_TYPES,
  type AddableType,
  type ElementType,
  SCREEN_KEYS,
  type ScreenKey,
} from '../lib/model';
import { TOOLBOX_MIME } from './editor-canvas';

export const TYPE_ICONS: Record<ElementType, typeof Type> = {
  text: Type,
  image: ImageIcon,
  button: MousePointerClick,
  shape: Shapes,
  countdown: Clock,
  prizeList: Gift,
  gameStage: Gamepad2,
  form: ClipboardList,
};

const SCREEN_ICONS: Record<ScreenKey, typeof Home> = {
  cover: Home,
  form: ClipboardList,
  game: Gamepad2,
  resultWin: Trophy,
  resultLose: Frown,
};

export function ScreensPanel({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}) {
  const t = useTranslations('canvasLab');
  return (
    <Menu
      mode="inline"
      selectedKeys={[state.screen]}
      onClick={({ key }) => dispatch({ type: 'selectScreen', screen: key as ScreenKey })}
      items={SCREEN_KEYS.map((key) => {
        const Icon = SCREEN_ICONS[key];
        return { key, icon: <Icon className="size-4" />, label: t(`screenNames.${key}`) };
      })}
    />
  );
}

export function Toolbox({ onAdd }: { onAdd: (type: AddableType) => void }) {
  const t = useTranslations('canvasLab');
  const { token } = theme.useToken();
  return (
    <div className="grid grid-cols-3 gap-2">
      {ADDABLE_TYPES.map((type) => {
        const Icon = TYPE_ICONS[type];
        return (
          <Tooltip key={type} title={t('addHint')}>
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TOOLBOX_MIME, type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAdd(type)}
              data-testid={`toolbox-${type}`}
              className="flex cursor-grab flex-col items-center gap-1 p-2"
              style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                background: token.colorBgContainer,
              }}
            >
              <IconTile size={32}>
                <Icon className="size-4" />
              </IconTile>
              <Caption>{t(`types.${type}`)}</Caption>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function LayersPanel({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}) {
  const t = useTranslations('canvasLab');
  const { token } = theme.useToken();
  const elements = currentScreen(state).elements;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  // Top layer first, like design tools; `index` below is the array (z) index.
  const rows = elements.map((el, index) => ({ el, index })).reverse();

  return (
    <Flex vertical gap={2}>
      {rows.map(({ el, index }) => {
        const Icon = TYPE_ICONS[el.type];
        const selected = el.id === state.selectedId;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a draggable row with nested buttons
          <div
            key={el.id}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => {
              setDragId(el.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) dispatch({ type: 'reorder', id: dragId, toIndex: index });
              setDragId(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverIndex(null);
            }}
            onClick={() => dispatch({ type: 'select', id: el.id })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') dispatch({ type: 'select', id: el.id });
            }}
            data-testid="layer-row"
            className="flex cursor-pointer items-center gap-2 px-2 py-1.5"
            style={{
              borderRadius: token.borderRadiusSM,
              background: selected ? token.colorPrimaryBg : undefined,
              borderTop:
                overIndex === index && dragId !== el.id
                  ? `2px solid ${token.colorPrimary}`
                  : '2px solid transparent',
              opacity: el.hidden ? 0.5 : 1,
            }}
          >
            <Typography.Text type="secondary" className="flex cursor-grab">
              <GripVertical className="size-3.5" />
            </Typography.Text>
            <Typography.Text type={selected ? undefined : 'secondary'} className="flex">
              <Icon className="size-3.5" />
            </Typography.Text>
            <Typography.Text ellipsis className="min-w-0 flex-1" strong={selected}>
              {el.name}
            </Typography.Text>
            <Button
              type="text"
              size="small"
              aria-label={el.hidden ? t('show') : t('hide')}
              icon={el.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'update', id: el.id, patch: { hidden: !el.hidden } });
              }}
            />
            <Button
              type="text"
              size="small"
              aria-label={el.locked ? t('unlock') : t('lock')}
              icon={el.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'update', id: el.id, patch: { locked: !el.locked } });
              }}
            />
          </div>
        );
      })}
    </Flex>
  );
}
