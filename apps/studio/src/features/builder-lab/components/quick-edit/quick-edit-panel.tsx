'use client';

import { AlertDialog, Button, Card, Input, toast } from '@playora/ui/components';
import { Check, Plus, Trash2 } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Caption } from '@/components/caption';
import { extractPaletteFromImage } from '@/features/brand-kits/lib/extract-palette';
import {
  type BrandColorKey,
  presetSrc,
  SCREEN_KEYS,
  type ScreenKey,
  type SlotKey,
} from '@/features/canvas-editor/lib/model';
import type { Campaign, Prize, SkinKey } from '../../api';
import { buildScreens, getTemplate, skinBrand } from '../../lib/starter';
import { FitScreen } from '../editor/fit-screen';
import type { DraftPatch } from '../editor/use-campaign-draft';
import { PrizeImagePicker } from '../rules/prize-image-picker';
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
  const tPrizes = useTranslations('builderLab.rules.prizes');
  const tBrand = useTranslations('canvasLab.brand');
  const tCommon = useTranslations('common');
  const [pendingSkin, setPendingSkin] = useState<SkinKey | null>(null);

  const updatePrize = (id: string, patch: Partial<Prize>) => {
    onChange({
      prizes: campaign.prizes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const addPrize = () => {
    const nextIndex = campaign.prizes.length + 1;
    const id = `p${Date.now().toString(36)}`;
    onChange({
      prizes: [
        ...campaign.prizes,
        {
          id,
          name: tPrizes('newName', { n: nextIndex }),
          image: presetSrc('gift'),
          quantity: 20,
          valueVnd: 15_000,
          probability: 0.1,
        },
      ],
    });
  };

  const removePrize = (id: string) => {
    if (campaign.prizes.length <= 1) return;
    onChange({
      prizes: campaign.prizes.filter((p) => p.id !== id),
    });
  };

  const slots = presentSlots(campaign.screens);
  const imageSlots = slots.filter((s) => SLOT_KIND[s] === 'image');
  const textSlots = slots.filter((s) => SLOT_KIND[s] !== 'image');

  const firstScreenWith = (slot: SlotKey) =>
    SCREEN_KEYS.find((key) => campaign.screens[key].elements.some((e) => e.slot === slot));

  const handleSuggestPalette = async (imageUrl: string) => {
    try {
      const palette = await extractPaletteFromImage(imageUrl);
      onChange({
        brand: {
          ...campaign.brand,
          primary: palette.primary,
          accent: palette.accent,
          background: palette.background,
          surface: palette.surface,
          text: palette.text,
        },
      });
      toast.success(t('paletteApplied'));
    } catch {
      toast.error(t('uploadFailed'));
    }
  };

  const renderSlot = (slot: SlotKey) => (
    <SlotCard
      key={slot}
      orgId={campaign.organizationId}
      slot={slot}
      value={readSlot(campaign.screens, slot) ?? ''}
      usage={slotUsage(campaign.screens, slot)}
      onChange={(value) => onChange({ screens: writeSlot(campaign.screens, slot, value) })}
      onSuggestPalette={slot === 'logo' ? handleSuggestPalette : undefined}
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
      <Section title={t('prizes')} hint={t('prizesHint')}>
        <div data-testid="quick-edit-prizes" className="flex flex-col gap-2.5">
          {campaign.prizes.map((prize) => (
            <Card key={prize.id} className="p-2.5">
              <div className="flex items-center gap-2.5">
                <PrizeImagePicker
                  orgId={campaign.organizationId}
                  value={prize.image}
                  name={prize.name}
                  onChange={(image) => updatePrize(prize.id, { image })}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Input
                    aria-label={tPrizes('name')}
                    value={prize.name}
                    placeholder={tPrizes('namePlaceholder')}
                    onFocus={() => onShowScreen('game')}
                    onChange={(e) => updatePrize(prize.id, { name: e.target.value })}
                    className="h-8 text-xs font-medium"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">{tPrizes('quantity')}</span>
                    <Input
                      type="number"
                      min={0}
                      aria-label={`${tPrizes('quantity')} ${prize.name}`}
                      value={String(prize.quantity)}
                      onFocus={() => onShowScreen('cover')}
                      onChange={(e) =>
                        updatePrize(prize.id, {
                          quantity: Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="h-7 w-24 text-xs tabular-nums"
                    />
                  </div>
                </div>
                {campaign.prizes.length > 1 && (
                  <Button
                    isIconOnly
                    variant="ghost"
                    size="sm"
                    aria-label={t('removePrize')}
                    onPress={() => removePrize(prize.id)}
                  >
                    <Trash2 className="size-3.5 text-text-tertiary" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {campaign.prizes.length < 20 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onPress={addPrize}
              className="w-full"
            >
              <Plus className="mr-1.5 size-3.5" />
              {t('addPrize')}
            </Button>
          )}
        </div>
      </Section>
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
                <Input
                  aria-label={tBrand(key)}
                  value={campaign.brand[key] || ''}
                  onChange={(e) =>
                    onChange({ brand: { ...campaign.brand, [key]: e.target.value } })
                  }
                  className="w-24 font-mono text-xs uppercase"
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onPress={() => {
              onChange({ brand: skinBrand(campaign.skinKey) });
              toast.success(t('skinBrandApplied'));
            }}
            className="mt-1 w-full text-xs"
          >
            {t('applySkinBrand')}
          </Button>
        </div>
      </Section>

      <AlertDialog.Backdrop
        isOpen={!!pendingSkin}
        onOpenChange={(open) => !open && setPendingSkin(null)}
        isDismissable
      >
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Heading>{t('skinConfirmTitle')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-body-2-regular text-text-secondary">{t('skinConfirm')}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="secondary" size="sm">
                {tCommon('cancel')}
              </Button>
              <Button slot="close" variant="primary" size="sm" onPress={confirmSkin}>
                {t('skinConfirmOk')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
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
          <Card
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
            className={`cursor-pointer overflow-hidden p-0 transition-all ${
              active
                ? 'border-accent ring-1 ring-accent/20'
                : 'border-border hover:border-border/80'
            }`}
          >
            <div className="relative h-20 w-full bg-surface-secondary/50">
              {cover && <FitScreen screen={cover} brand={skin.brand} />}
              {active && (
                <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-xs">
                  <Check className="size-2.5" />
                </span>
              )}
            </div>
            <Card.Content className="p-2">
              <span className="block truncate text-center text-xs font-medium text-foreground">
                {t(`skins.${skin.key}`)}
              </span>
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
}
