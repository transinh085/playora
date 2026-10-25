'use client';

import { App, Card, ColorPicker, Flex, Typography, theme } from 'antd';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Caption } from '@/components/caption';
import {
  type BrandColorKey,
  SCREEN_KEYS,
  type ScreenKey,
  type SlotKey,
} from '@/features/canvas-editor/lib/model';
import { buildScreens, getTemplate } from '../../mock/templates';
import type { Campaign, SkinKey } from '../../mock/types';
import { FitScreen } from '../editor/fit-screen';
import type { DraftPatch } from '../editor/use-campaign-draft';
import { SlotCard } from './slot-card';
import { presentSlots, readSlot, SLOT_KIND, slotUsage, switchSkin, writeSlot } from './slots';

const BRAND_KEYS: BrandColorKey[] = ['primary', 'accent', 'background', 'text', 'surface'];

/** Quick edit's left column: slot cards, skin switcher and brand colours (docs/15 §4.2). */
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
  const { modal } = App.useApp();
  const slots = presentSlots(campaign.screens);
  const imageSlots = slots.filter((s) => SLOT_KIND[s] === 'image');
  const textSlots = slots.filter((s) => SLOT_KIND[s] !== 'image');

  const firstScreenWith = (slot: SlotKey) =>
    SCREEN_KEYS.find((key) => campaign.screens[key].elements.some((e) => e.slot === slot));

  const renderSlot = (slot: SlotKey) => (
    <SlotCard
      key={slot}
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
    modal.confirm({
      title: t('skinConfirmTitle'),
      content: t('skinConfirm'),
      okText: t('skinConfirmOk'),
      onOk: () => onChange(switchSkin(campaign, skinKey)),
    });
  };

  return (
    <Flex vertical gap={24}>
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
        <Flex vertical gap={10}>
          {BRAND_KEYS.map((key) => (
            <Flex key={key} align="center" justify="space-between" gap={12}>
              <Typography.Text>{tBrand(key)}</Typography.Text>
              <ColorPicker
                showText
                disabledAlpha
                value={campaign.brand[key]}
                onChange={(color) =>
                  onChange({ brand: { ...campaign.brand, [key]: color.toHexString() } })
                }
              />
            </Flex>
          ))}
        </Flex>
      </Section>
    </Flex>
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
    <Flex vertical gap={12}>
      <div>
        <Typography.Text strong className="block">
          {title}
        </Typography.Text>
        <Caption>{hint}</Caption>
      </div>
      {children}
    </Flex>
  );
}

/** The template's skins as small cover previews in the skin's own colours. */
function SkinPicker({ campaign, onPick }: { campaign: Campaign; onPick: (skin: SkinKey) => void }) {
  const t = useTranslations('builderLab.home');
  const { token } = theme.useToken();
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
            hoverable
            variant="borderless"
            onClick={() => onPick(skin.key)}
            data-testid={`skin-${skin.key}`}
            style={{
              border: `${active ? 2 : 1}px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`,
              overflow: 'hidden',
            }}
            styles={{ body: { padding: 8 } }}
            cover={
              <div style={{ height: 96 }} className="relative">
                {cover && <FitScreen screen={cover} brand={skin.brand} />}
                {active && (
                  <span
                    className="absolute top-1.5 right-1.5 flex items-center justify-center"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: token.colorPrimary,
                      color: token.colorWhite,
                    }}
                  >
                    <Check className="size-3" />
                  </span>
                )}
              </div>
            }
          >
            <Typography.Text ellipsis className="block text-center" style={{ fontSize: 13 }}>
              {t(`skins.${skin.key}`)}
            </Typography.Text>
          </Card>
        );
      })}
    </div>
  );
}
