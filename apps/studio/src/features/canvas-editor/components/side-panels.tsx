'use client';

import { Button } from '@playora/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
import {
  Award,
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
  Megaphone,
  MessageCircle,
  Minus,
  MousePointerClick,
  Shapes,
  Trophy,
  Type,
  Unlock,
  Volume2,
} from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { type Dispatch, memo, useState } from 'react';
import { Caption } from '@/components/caption';
import { IconTile } from '@/components/icon-tile';
import { currentScreen, type EditorAction, type EditorState } from '../lib/editor-state';
import { type AddableType, type ElementType, SCREEN_KEYS, type ScreenKey } from '../lib/model';
import { TOOLBOX_MIME } from './editor-canvas';

export const TYPE_ICONS: Record<ElementType, typeof Type> = {
  text: Type,
  image: ImageIcon,
  button: MousePointerClick,
  badge: Award,
  marquee: Megaphone,
  shape: Shapes,
  divider: Minus,
  countdown: Clock,
  prizeList: Gift,
  audio: Volume2,
  social: MessageCircle,
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

const TOOLBOX_GROUPS: {
  category: 'content' | 'interactive' | 'decor';
  types: AddableType[];
}[] = [
  { category: 'content', types: ['text', 'image', 'badge', 'marquee'] },
  { category: 'interactive', types: ['button', 'countdown', 'prizeList', 'social', 'audio'] },
  { category: 'decor', types: ['shape', 'divider'] },
];

function ScreensPanelView({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}) {
  const t = useTranslations('canvasLab');
  return (
    <div className="flex flex-col gap-1">
      {SCREEN_KEYS.map((key) => {
        const Icon = SCREEN_ICONS[key];
        const selected = state.screen === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => dispatch({ type: 'selectScreen', screen: key as ScreenKey })}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
              selected
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{t(`screenNames.${key}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Toolbox({ onAdd }: { onAdd: (type: AddableType) => void }) {
  const t = useTranslations('canvasLab');
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-3">
        {TOOLBOX_GROUPS.map((group) => (
          <div key={group.category} className="flex flex-col gap-1.5">
            <Caption className="text-xs uppercase tracking-wider opacity-60 font-semibold">
              {t(`toolboxCategories.${group.category}`)}
            </Caption>
            <div className="grid grid-cols-3 gap-2">
              {group.types.map((type) => {
                const Icon = TYPE_ICONS[type];
                return (
                  <Tooltip key={type}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(TOOLBOX_MIME, type);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => onAdd(type)}
                        data-testid={`toolbox-${type}`}
                        className="flex cursor-grab flex-col items-center gap-1 rounded-xl border border-border bg-card p-2 text-center transition-colors hover:border-primary/50"
                      >
                        <IconTile size={28}>
                          <Icon className="size-3.5" />
                        </IconTile>
                        <span className="text-[11px] leading-tight line-clamp-1">
                          {t(`types.${type}`)}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t('addHint')}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

function LayersPanelView({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}) {
  const t = useTranslations('canvasLab');
  const elements = currentScreen(state).elements;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  // Top layer first, like design tools; `index` below is the array (z) index.
  const rows = elements.map((el, index) => ({ el, index })).reverse();

  return (
    <div className="flex flex-col gap-1">
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
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
              selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
            } ${overIndex === index && dragId !== el.id ? 'border-t-2 border-primary' : 'border-t-2 border-transparent'} ${
              el.hidden ? 'opacity-50' : ''
            }`}
          >
            <span className="flex cursor-grab text-muted-foreground">
              <GripVertical className="size-3.5" />
            </span>
            <span className={selected ? 'flex text-primary' : 'flex text-muted-foreground'}>
              <Icon className="size-3.5" />
            </span>
            <span className={`min-w-0 flex-1 truncate text-xs ${selected ? 'font-semibold' : ''}`}>
              {el.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              aria-label={el.hidden ? t('show') : t('hide')}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'update', id: el.id, patch: { hidden: !el.hidden } });
              }}
            >
              {el.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              aria-label={el.locked ? t('unlock') : t('lock')}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'update', id: el.id, patch: { locked: !el.locked } });
              }}
            >
              {el.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/** Memoized: re-renders only when the editor state changes, not on zoom or parent sync. */
export const ScreensPanel = memo(ScreensPanelView);

/** Memoized: re-renders only when the editor state changes, not on zoom or parent sync. */
export const LayersPanel = memo(LayersPanelView);
