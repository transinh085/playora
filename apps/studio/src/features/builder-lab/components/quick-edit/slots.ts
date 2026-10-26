import {
  type CanvasDoc,
  type CanvasElement,
  SCREEN_KEYS,
  SLOT_KEYS,
  type SlotKey,
} from '@/features/canvas-editor/lib/model';
import type { Campaign, SkinKey } from '../../api';
import { buildScreens, skinBrand } from '../../lib/starter';

/**
 * Quick edit (docs/product/specs/builder.md §4.2): a slot is one piece of content shared by every element that carries
 * it, on every screen. Image slots hold a `src`, text slots a `content`, the CTA a button `label`.
 */
export type SlotKind = 'image' | 'text' | 'button';

export const SLOT_KIND: Record<SlotKey, SlotKind> = {
  logo: 'image',
  productPhoto: 'image',
  title: 'text',
  promoText: 'text',
  cta: 'button',
};

function slotValue(element: CanvasElement): string | undefined {
  if (element.type === 'image') return element.src;
  if (element.type === 'text') return element.content;
  if (element.type === 'button') return element.label;
  return undefined;
}

function withValue(element: CanvasElement, value: string): CanvasElement {
  if (element.type === 'image') return { ...element, src: value };
  if (element.type === 'text') return { ...element, content: value };
  if (element.type === 'button') return { ...element, label: value };
  return element;
}

/** Current value of a slot: the first element carrying it, cover first. */
export function readSlot(doc: CanvasDoc, slot: SlotKey): string | undefined {
  for (const key of SCREEN_KEYS) {
    const element = doc[key].elements.find((e) => e.slot === slot);
    if (element) return slotValue(element);
  }
  return undefined;
}

/** How many elements (over all screens) a slot drives. */
export function slotUsage(doc: CanvasDoc, slot: SlotKey): number {
  return SCREEN_KEYS.reduce(
    (count, key) => count + doc[key].elements.filter((e) => e.slot === slot).length,
    0,
  );
}

/** Slots this document exposes, in display order. */
export function presentSlots(doc: CanvasDoc): SlotKey[] {
  return SLOT_KEYS.filter((slot) => slotUsage(doc, slot) > 0);
}

/** Writes `value` into every element with `slot`, on every screen. Untouched screens keep identity. */
export function writeSlot(doc: CanvasDoc, slot: SlotKey, value: string): CanvasDoc {
  const next = { ...doc };
  for (const key of SCREEN_KEYS) {
    const screen = doc[key];
    if (!screen.elements.some((e) => e.slot === slot)) continue;
    next[key] = {
      ...screen,
      elements: screen.elements.map((e) => (e.slot === slot ? withValue(e, value) : e)),
    };
  }
  return next;
}

/**
 * Switching skin rebuilds the screens from the template but keeps what the owner changed: any slot
 * whose value differs from the old skin's default is carried over. Prizes and rules are untouched.
 */
export function switchSkin(
  campaign: Campaign,
  skinKey: SkinKey,
): Pick<Campaign, 'skinKey' | 'screens' | 'brand'> {
  const oldDefaults = buildScreens(campaign.templateKey, campaign.skinKey);
  let screens = buildScreens(campaign.templateKey, skinKey);
  for (const slot of SLOT_KEYS) {
    const value = readSlot(campaign.screens, slot);
    if (value !== undefined && value !== readSlot(oldDefaults, slot)) {
      screens = writeSlot(screens, slot, value);
    }
  }
  return { skinKey, screens, brand: skinBrand(skinKey) };
}
