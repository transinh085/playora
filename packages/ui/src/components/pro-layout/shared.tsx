/* biome-ignore-all lint: HeroUI Pro vendor implementation */
'use client';

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useIsPresent,
  useReducedMotion,
} from 'motion/react';
import {
  type ComponentProps,
  cloneElement,
  Fragment,
  isValidElement,
  type Key,
  type ReactNode,
  useContext,
  useMemo,
} from 'react';
import {
  CollectionRendererContext,
  composeRenderProps,
  DefaultCollectionRenderer,
} from 'react-aria-components';
import { cx } from '../../utils/cx';

export const DEFAULT_COOKIE_MAX_AGE = 604_800;

export function setCookie(name: string, value: string, maxAge = DEFAULT_COOKIE_MAX_AGE) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // Ignore cookie write failures in restricted environments
  }
}

const MODIFIERS = new Set(['alt', 'ctrl', 'meta', 'mod', 'shift']);

const KEY_ALIASES: Record<string, string> = {
  arrowdown: 'arrowdown',
  arrowleft: 'arrowleft',
  arrowright: 'arrowright',
  arrowup: 'arrowup',
  backspace: 'backspace',
  del: 'delete',
  delete: 'delete',
  down: 'arrowdown',
  enter: 'enter',
  esc: 'escape',
  escape: 'escape',
  left: 'arrowleft',
  return: 'enter',
  right: 'arrowright',
  space: ' ',
  tab: 'tab',
  up: 'arrowup',
};

export interface ParsedShortcut {
  alt: boolean;
  ctrl: boolean;
  key: string;
  meta: boolean;
  mod: boolean;
  shift: boolean;
}

export function parseShortcut(shortcut: string): ParsedShortcut | null {
  const parts = shortcut
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  let alt = false;
  let ctrl = false;
  let meta = false;
  let mod = false;
  let shift = false;
  let key: string | null = null;

  for (const part of parts) {
    if (MODIFIERS.has(part)) {
      if (part === 'alt') alt = true;
      else if (part === 'ctrl') ctrl = true;
      else if (part === 'meta') meta = true;
      else if (part === 'mod') mod = true;
      else if (part === 'shift') shift = true;
    } else {
      if (key !== null) return null;
      key = KEY_ALIASES[part] ?? part;
    }
  }

  return key === null ? null : { alt, ctrl, key, meta, mod, shift };
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

export function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
  if (event.key.toLowerCase() !== parsed.key) return false;
  if (parsed.mod) {
    if (!(event.metaKey || event.ctrlKey)) return false;
  } else {
    if (event.metaKey !== parsed.meta || event.ctrlKey !== parsed.ctrl) return false;
  }
  return event.altKey === parsed.alt && event.shiftKey === parsed.shift;
}

type SlotFn = ((props?: Record<string, unknown>) => string) | undefined;

export function composeSlotClassName(
  slotFn: SlotFn,
  className?: string,
  variants?: Record<string, unknown>,
): string | undefined {
  return slotFn ? slotFn({ ...variants, className }) : className;
}

export function composeTwRenderProps<T>(
  className: string | ((renderProps: T) => string) | undefined,
  slotClassName?: string,
): string | ((renderProps: T) => string) | undefined {
  return composeRenderProps(className, (cn) => cx(slotClassName, cn));
}

// ── Tree Collection Animation (HeroUI Pro submenu spring transition) ─────────

const TREE_SECTION_VARIANTS = {
  enter: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: {
      height: { bounce: 0, duration: 0.24, type: 'spring' as const },
      opacity: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
    },
    transitionEnd: { overflow: 'visible' },
  },
  exit: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: {
      height: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
      opacity: { duration: 0.1, ease: [0.23, 1, 0.32, 1] as const },
    },
  },
};

interface CollectionNode {
  key: Key;
  nextKey?: Key | null;
  parentKey?: Key | null;
  render?: (node: CollectionNode) => ReactNode;
  type: string;
}

interface TreeCollectionLike extends Iterable<CollectionNode> {
  getChildren(key: Key): Iterable<CollectionNode>;
  getItem(key: Key): CollectionNode | null | undefined;
  getKeyAfter(key: Key): Key | null | undefined;
}

type DropIndicatorTarget = {
  dropPosition: 'before' | 'after' | 'on';
  key: Key;
  type: 'item';
};

type RenderDropIndicatorFn = ((target: DropIndicatorTarget) => ReactNode) | undefined;

function withNodeKey(element: ReactNode, key: Key): ReactNode {
  if (element == null || typeof element === 'boolean') return null;
  if (isValidElement(element)) return cloneElement(element, { key });
  return <Fragment key={key}>{element}</Fragment>;
}

function renderIndicator(
  renderDropIndicator: RenderDropIndicatorFn,
  target: DropIndicatorTarget,
  key: string,
): ReactNode {
  return renderDropIndicator ? withNodeKey(renderDropIndicator(target), key) : null;
}

function getDirectChildNodes(
  collection: TreeCollectionLike,
  parent?: CollectionNode | null,
): CollectionNode[] {
  const source = parent ? Array.from(collection.getChildren(parent.key)) : Array.from(collection);
  const parentKey = parent?.key ?? null;
  return source.filter((node) => node.type !== 'content' && (node.parentKey ?? null) === parentKey);
}

function renderTreeNode(
  collection: TreeCollectionLike,
  node: CollectionNode,
  renderDropIndicator?: RenderDropIndicatorFn,
): ReactNode {
  if (node.type === 'item') {
    return (
      <AnimatedTreeItemNode
        key={node.key}
        collection={collection}
        node={node}
        renderDropIndicator={renderDropIndicator}
      />
    );
  }
  return withNodeKey(node.render?.(node), node.key);
}

function AnimatedCollectionItems({
  collection,
  parent,
  renderDropIndicator,
}: {
  collection: TreeCollectionLike;
  parent?: CollectionNode | null;
  renderDropIndicator?: RenderDropIndicatorFn;
}) {
  return getDirectChildNodes(collection, parent).map((node) =>
    renderTreeNode(collection, node, renderDropIndicator),
  );
}

function isTreeNodeExpanded(collection: TreeCollectionLike, node: CollectionNode): boolean {
  let nextKey = collection.getKeyAfter(node.key);
  let nextNode = nextKey != null ? collection.getItem(nextKey) : null;
  while (nextNode && nextNode.type === 'content') {
    nextKey = collection.getKeyAfter(nextNode.key);
    nextNode = nextKey != null ? collection.getItem(nextKey) : null;
  }
  return nextNode?.parentKey === node.key;
}

function getNextSiblingItem(
  collection: TreeCollectionLike,
  node: CollectionNode,
): CollectionNode | null | undefined {
  let current = node.nextKey != null ? collection.getItem(node.nextKey) : null;
  while (current && current.type !== 'item') {
    current = current.nextKey != null ? collection.getItem(current.nextKey) : null;
  }
  return current;
}

function AnimatedTreeItemNode({
  collection,
  node,
  renderDropIndicator,
}: {
  collection: TreeCollectionLike;
  node: CollectionNode;
  renderDropIndicator?: RenderDropIndicatorFn;
}) {
  const rendered = node.render?.(node);
  if (rendered == null || typeof rendered === 'boolean') return null;

  const childNodes = getDirectChildNodes(collection, node);
  const isExpanded = childNodes.length > 0 && isTreeNodeExpanded(collection, node);
  const isLastSibling = getNextSiblingItem(collection, node) == null;

  const beforeIndicator = renderIndicator(
    renderDropIndicator,
    { dropPosition: 'before', key: node.key, type: 'item' },
    `${String(node.key)}-before`,
  );
  const afterIndicator = isLastSibling
    ? renderIndicator(
        renderDropIndicator,
        { dropPosition: 'after', key: node.key, type: 'item' },
        `${String(node.key)}-after`,
      )
    : null;

  return (
    <Fragment key={node.key}>
      {beforeIndicator}
      {rendered}
      {childNodes.length > 0 ? (
        <AnimatePresence initial={false}>
          {isExpanded ? (
            <AnimatedTreeChildSection
              key={`${String(node.key)}-children`}
              childNodes={childNodes}
              collection={collection}
              renderDropIndicator={renderDropIndicator}
            />
          ) : null}
        </AnimatePresence>
      ) : null}
      {afterIndicator}
    </Fragment>
  );
}

function AnimatedTreeChildSection({
  childNodes,
  collection,
  renderDropIndicator,
}: {
  childNodes: CollectionNode[];
  collection: TreeCollectionLike;
  renderDropIndicator?: RenderDropIndicatorFn;
}) {
  const isPresent = useIsPresent();
  return (
    <m.div
      animate="enter"
      aria-hidden={!isPresent || undefined}
      data-tree-motion-section=""
      exit="exit"
      initial="exit"
      role="presentation"
      style={{ pointerEvents: isPresent ? undefined : 'none' }}
      variants={TREE_SECTION_VARIANTS}
    >
      {childNodes.map((child) => renderTreeNode(collection, child, renderDropIndicator))}
    </m.div>
  );
}

export function TreeCollectionAnimation({
  children,
  reduceMotion,
}: {
  children: ReactNode;
  reduceMotion?: boolean;
}) {
  const parentRenderer = useContext(CollectionRendererContext) ?? DefaultCollectionRenderer;
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate =
    !(reduceMotion !== undefined ? reduceMotion : prefersReducedMotion) &&
    !parentRenderer.isVirtualized;

  const rendererValue = useMemo(() => {
    if (!shouldAnimate) return parentRenderer;
    return {
      ...parentRenderer,
      CollectionBranch: ({
        collection,
        parent,
        renderDropIndicator,
      }: {
        collection: unknown;
        parent: unknown;
        renderDropIndicator?: unknown;
      }) => (
        <AnimatedCollectionItems
          collection={collection as TreeCollectionLike}
          parent={parent as CollectionNode | null}
          renderDropIndicator={renderDropIndicator as RenderDropIndicatorFn}
        />
      ),
      CollectionRoot: ({
        collection,
        renderDropIndicator,
      }: {
        collection: unknown;
        renderDropIndicator?: unknown;
      }) => (
        <AnimatedCollectionItems
          collection={collection as TreeCollectionLike}
          renderDropIndicator={renderDropIndicator as RenderDropIndicatorFn}
        />
      ),
    };
  }, [parentRenderer, shouldAnimate]);

  return (
    <CollectionRendererContext.Provider value={rendererValue as typeof parentRenderer}>
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </CollectionRendererContext.Provider>
  );
}

// ── HeroUI Pro Layout SVG Icons ──────────────────────────────────────────────

export function IconChevronRight(props: ComponentProps<'svg'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" {...props}>
      <path
        clipRule="evenodd"
        d="M5.47 13.03a.75.75 0 0 1 0-1.06L9.44 8 5.47 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function IconLayoutSideContentLeft(props: ComponentProps<'svg'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" {...props}>
      <path
        clipRule="evenodd"
        d="M4.5 3.5A1.5 1.5 0 0 0 3 5v6a1.5 1.5 0 0 0 1.5 1.5H6v-9zm3 9h4A1.5 1.5 0 0 0 13 11V5a1.5 1.5 0 0 0-1.5-1.5h-4zM1.5 5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function IconLayoutSideContentRight(props: ComponentProps<'svg'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" {...props}>
      <path
        clipRule="evenodd"
        d="M11.5 3.5H10v9h1.5A1.5 1.5 0 0 0 13 11V5a1.5 1.5 0 0 0-1.5-1.5m-3 9v-9h-4A1.5 1.5 0 0 0 3 5v6a1.5 1.5 0 0 0 1.5 1.5zM1.5 5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function IconBars3(props: ComponentProps<'svg'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" {...props}>
      <path
        clipRule="evenodd"
        d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75M2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8m0 4.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function IconGripDotsVertical(props: ComponentProps<'svg'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" {...props}>
      <path
        clipRule="evenodd"
        d="M7 3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M5.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m0-5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M7 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m3.5 1.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function IconGripDotsHorizontal(props: ComponentProps<'svg'>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" {...props}>
      <path
        clipRule="evenodd"
        d="M3 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m6.5 1.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m0-5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m-5 0a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0M13 9a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m1.5-3.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}
