'use client';

import { InputBase } from '@playora/ui/components/base/input/input';
import { AlertDialog } from '@playora/ui/components/base/modal/modal';
import { Check } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Caption } from '@/components/caption';
import {
  type BrandColorKey,
  SCREEN_KEYS,
  type ScreenKey,
  type SlotKey,
} from '@/features/canvas-editor/lib/model';
import type { Campaign, SkinKey } from '../../api';
import { buildScreens, getTemplate } from '../../lib/starter';
import { FitScreen } from '../editor/fit-screen';
import type { DraftPatch } from '../editor/use-campaign-draft';
import { SlotCard } from './slot-card';
import { presentSlots, readSlot, SLOT_KIND, slotUsage, switchSkin, writeSlot } from './slots';

const BRAND_KEYS: BrandColorKey[] = ['primary', 'accent', 'background', 'text', 'surface'];

/** Quick edit's left column: slot cards, skin switcher and brand colours (docs/product/specs/builder.md §4.2). */
export function QuickEditPanel({
  campaign,
  onChange,
  onShowScreen,
}: {
  campaign: Campaign;
  onChange: (patch: DraftPatch) => void;
  onShowScreen: (screen: ScreenKey) => void;
}) {
  const t = useTranslations('builderLab.quickEdit');
  const tBrand = useTranslations('canvasLab.brand');
  const tCommon = useTranslations('common');
  const [pendingSkin, setPendingSkin] = useState<SkinKey | null>(null);

  const slots = presentSlots(campaign.screens);
  const imageSlots = slots.filter((s) => SLOT_KIND[s] === 'image');
  const textSlots = slots.filter((s) => SLOT_KIND[s] !== 'image');

  const firstScreenWith = (slot: SlotKey) =>
    SCREEN_KEYS.find((key) => campaign.screens[key].elements.some((e) => e.slot === slot));

  const renderSlot = (slot: SlotKey) => (
    <SlotCard
      key={slot}
      orgId={campaign.organizationId}
      slot={slot}
      value={readSlot(campaign.screens, slot) ?? ''}
      usage={slotUsage(campaign.screens, slot)}
      onChange={(value) => onChange({ screens: writeSlot(campaign.screens, slot, value) })}
      onFocus={() => {
        const screen = firstScreenWith(slot);
        if (screen) onShowScreen(screen);
      }}
    />
  );

  const pickSkin = (skinKey: SkinKey) => {
    if (skinKey === campaign.skinKey) return;
    setPendingSkin(skinKey);
  };

  const confirmSkin = () => {
    if (!pendingSkin) return;
    onChange(switchSkin(campaign, pendingSkin));
    setPendingSkin(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {imageSlots.length > 0 && (
        <Section title={t('images')} hint={t('imagesHint')}>
          {imageSlots.map(renderSlot)}
        </Section>
      )}
      {textSlots.length > 0 && (
        <Section title={t('texts')} hint={t('textsHint')}>
          {textSlots.map(renderSlot)}
        </Section>
      )}
      <Section title={t('skin')} hint={t('skinHint')}>
        <SkinPicker campaign={campaign} onPick={pickSkin} />
      </Section>
      <Section title={t('brand')} hint={t('brandHint')}>
        <div className="flex flex-col gap-2.5">
          {BRAND_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm">{tBrand(key)}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={campaign.brand[key] || '#000000'}
                  onChange={(e) =>
                    onChange({ brand: { ...campaign.brand, [key]: e.target.value } })
                  }
                  className="size-8 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
                  aria-label={tBrand(key)}
                />
                <InputBase
                  aria-label={tBrand(key)}
                  value={campaign.brand[key] || ''}
                  onChange={(e) =>
                    onChange({ brand: { ...campaign.brand, [key]: e.target.value } })
                  }
                  fieldClassName="w-24"
                  className="font-mono text-xs uppercase"
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <AlertDialog
        isOpen={!!pendingSkin}
        onOpenChange={(open) => !open && setPendingSkin(null)}
        title={t('skinConfirmTitle')}
        description={t('skinConfirm')}
        cancelLabel={tCommon('cancel')}
        confirmLabel={t('skinConfirmOk')}
        onConfirm={confirmSkin}
      />
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="block font-semibold text-sm">{title}</span>
        <Caption>{hint}</Caption>
      </div>
      {children}
    </div>
  );
}

/** The template's skins as small cover previews in the skin's own colours. */
function SkinPicker({ campaign, onPick }: { campaign: Campaign; onPick: (skin: SkinKey) => void }) {
  const t = useTranslations('builderLab.home');
  const skins = getTemplate(campaign.templateKey).skins;
  const covers = useMemo(
    () => skins.map((skin) => buildScreens(campaign.templateKey, skin.key).cover),
    [campaign.templateKey, skins],
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      {skins.map((skin, i) => {
        const active = skin.key === campaign.skinKey;
        const cover = covers[i];
        return (
          // biome-ignore lint/a11y/useSemanticElements: interactive skin card
          <div
            key={skin.key}
            role="button"
            tabIndex={0}
            onClick={() => onPick(skin.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(skin.key);
              }
            }}
            data-testid={`skin-${skin.key}`}
            className={`cursor-pointer overflow-hidden rounded-lg border transition-all shadow-xs ${
              active
                ? 'border-neutral-900 ring-1 ring-neutral-900/10 dark:border-white dark:ring-white/20'
                : 'border-neutral-200 hover:border-neutral-400 dark:border-white/10 dark:hover:border-white/20'
            }`}
          >
            <div className="relative h-20 w-full bg-neutral-100/50 dark:bg-white/5">
              {cover && <FitScreen screen={cover} brand={skin.brand} />}
              {active && (
                <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-neutral-900 text-white shadow-xs dark:bg-white dark:text-neutral-900">
                  <Check className="size-2.5" />
                </span>
              )}
            </div>
            <div className="p-2">
              <span className="block truncate text-center text-xs font-medium text-neutral-900 dark:text-neutral-100">
                {t(`skins.${skin.key}`)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
