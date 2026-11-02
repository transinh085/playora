'use client';

import { Mechanism } from '@playora/ui/campaign';
import {
  Alert,
  Button,
  Card,
  Chip,
  CloseButton,
  Drawer,
  PhoneMockup,
  Tabs,
} from '@playora/ui/components';
import { cx } from '@playora/ui/utils/cx';
import {
  RiBookmarkFill,
  RiBookmarkLine,
  RiCheckDoubleLine,
  RiGiftLine,
  RiMagicLine,
  RiPaletteLine,
  RiShieldCheckLine,
  RiTimeLine,
} from '@remixicon/react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FitScreen } from '@/features/builder-lab/components/editor/fit-screen';
import { buildScreens, defaultPrizes, type SkinKey } from '@/features/builder-lab/lib/starter';
import { useMechanismLabels } from '@/features/canvas-editor/components/use-canvas-labels';
import type { ScreenKey } from '@/features/canvas-editor/lib/model';
import { type CatalogTemplate, SKINS_INFO } from '../data/mock-templates';

function isValidSkinKey(key: string): key is SkinKey {
  return key === 'tet' || key === 'grand-opening' || key === 'everyday';
}

const PREVIEW_PRIZES = defaultPrizes();

export function TemplatePreviewDrawer({
  template,
  isOpen,
  onClose,
  onUseTemplate,
  isSaved = false,
  onToggleSave,
}: {
  template: CatalogTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: CatalogTemplate) => void;
  isSaved?: boolean;
  onToggleSave?: (templateId: string) => void;
}) {
  const t = useTranslations('templatesCatalog.drawer');
  const mechanismLabels = useMechanismLabels();
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('cover');
  const [selectedSkinKey, setSelectedSkinKey] = useState<string>('');
  const [simulatedOutcome, setSimulatedOutcome] = useState<'win' | 'lose'>('win');
  const [roundKey, setRoundKey] = useState(0);

  // Cache template in ref so drawer stays populated during 300ms exit animation
  const lastTemplateRef = useRef<CatalogTemplate | null>(template);
  if (template) {
    lastTemplateRef.current = template;
  }
  const displayTemplate = template ?? lastTemplateRef.current;

  // Cache saved status during exit transition
  const lastSavedRef = useRef(isSaved);
  if (isOpen) {
    lastSavedRef.current = isSaved;
  }
  const effectiveSaved = isOpen ? isSaved : lastSavedRef.current;

  useEffect(() => {
    if (template) {
      setSelectedSkinKey(template.skinKey);
      setActiveScreen('cover');
      setSimulatedOutcome('win');
      setRoundKey((k) => k + 1);
    }
  }, [template]);

  const effectiveSkin = useMemo(() => {
    if (!displayTemplate) return null;
    const skinKey = isValidSkinKey(selectedSkinKey) ? selectedSkinKey : displayTemplate.skinKey;
    const skinOption = displayTemplate.availableSkins.find((s) => s.key === skinKey);
    const skinInfo = SKINS_INFO[skinKey];
    const screens =
      skinKey === displayTemplate.skinKey
        ? displayTemplate.screens
        : buildScreens(displayTemplate.realTemplateKey, skinKey);

    return {
      skinKey,
      skinName: skinOption?.name ?? skinInfo?.name ?? displayTemplate.skinName,
      brand: skinInfo?.brand ?? displayTemplate.brand,
      screens,
    };
  }, [displayTemplate, selectedSkinKey]);

  if (!displayTemplate || !effectiveSkin) return null;

  const currentDoc = effectiveSkin.screens[activeScreen];
  const sampleWinPrize = PREVIEW_PRIZES[0];

  const previewStage =
    activeScreen === 'game' ? (
      <Mechanism
        key={`${displayTemplate.realTemplateKey}-${effectiveSkin.skinKey}-${simulatedOutcome}-${roundKey}`}
        mechanism={displayTemplate.realTemplateKey}
        skinKey={effectiveSkin.skinKey}
        brand={effectiveSkin.brand}
        prizes={PREVIEW_PRIZES}
        labels={mechanismLabels}
        play={{
          onPlay: async () => {
            if (simulatedOutcome === 'win' && sampleWinPrize) {
              return {
                playId: `preview-${roundKey}`,
                outcome: 'win',
                reason: 'win',
                prize: {
                  id: sampleWinPrize.id,
                  name: sampleWinPrize.name,
                  image: sampleWinPrize.image,
                },
                voucher: { code: 'DEMO88', expiresAt: null },
                turnsLeftToday: 2,
              };
            }
            return {
              playId: `preview-${roundKey}`,
              outcome: 'lose',
              reason: 'lose',
              prize: null,
              voucher: null,
              turnsLeftToday: 2,
            };
          },
          onDone: (res) => {
            setRoundKey((k) => k + 1);
            setActiveScreen(res.outcome === 'win' ? 'resultWin' : 'resultLose');
          },
        }}
      />
    ) : undefined;

  return (
    <Drawer isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Backdrop isDismissable>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full w-full max-w-[960px] flex-col bg-surface p-0 sm:w-full xl:max-w-[1040px]">
            {/* Drawer Header */}
            <Drawer.Header className="mb-0 flex-row items-center justify-between gap-4 border-b border-separator px-6 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <Drawer.Heading className="truncate text-body-semibold text-text-primary">
                  {displayTemplate.name}
                </Drawer.Heading>
                <Chip
                  color={displayTemplate.engineKind === 'instant' ? 'accent' : 'warning'}
                  variant="soft"
                  size="sm"
                  className="shrink-0"
                >
                  {displayTemplate.engineKind === 'instant' ? t('instantWin') : t('skillGame')}
                </Chip>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant={effectiveSaved ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => onToggleSave?.(displayTemplate.id)}
                >
                  {effectiveSaved ? (
                    <RiBookmarkFill className="size-4" />
                  ) : (
                    <RiBookmarkLine className="size-4" />
                  )}
                  {effectiveSaved ? t('saved') : t('save')}
                </Button>
                <CloseButton aria-label={t('close')} onPress={onClose} />
              </div>
            </Drawer.Header>

            {/* Drawer Body - Split View (Phone Canvas on Left, Specs on Right) */}
            <Drawer.Body className="m-0 mt-0 flex flex-1 flex-col overflow-hidden p-0 text-text-primary lg:flex-row">
              {/* Left Column: Phone Canvas Preview */}
              <div className="flex flex-col items-center justify-center overflow-y-auto border-b border-separator bg-surface-secondary/50 p-6 lg:w-[440px] lg:shrink-0 lg:border-r lg:border-b-0">
                {/* Screen Switcher (All 5 screens) */}
                <div className="mb-3 shrink-0">
                  <Tabs
                    selectedKey={activeScreen}
                    onSelectionChange={(key) => setActiveScreen(String(key) as ScreenKey)}
                  >
                    <Tabs.ListContainer>
                      <Tabs.List aria-label="Screen preview">
                        <Tabs.Tab id="cover" className="whitespace-nowrap">
                          {t('screens.cover')}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="form" className="whitespace-nowrap">
                          {t('screens.form')}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="game" className="whitespace-nowrap">
                          {t('screens.game')}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="resultWin" className="whitespace-nowrap">
                          {t('screens.win')}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                        <Tabs.Tab id="resultLose" className="whitespace-nowrap">
                          {t('screens.lose')}
                          <Tabs.Indicator />
                        </Tabs.Tab>
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </Tabs>
                </div>

                {/* Simulated Win / Lose toggle on the Game screen */}
                {activeScreen === 'game' && (
                  <div
                    data-testid="preview-outcome-toggle"
                    className="mb-3 flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-caption-2-medium"
                  >
                    <span className="text-text-tertiary">{t('tryPlayInteractive')}:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSimulatedOutcome('win');
                        setRoundKey((k) => k + 1);
                      }}
                      className={cx(
                        'cursor-pointer rounded-full px-2.5 py-0.5 transition-colors',
                        simulatedOutcome === 'win'
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'text-text-secondary hover:text-text-primary',
                      )}
                    >
                      {t('screens.win')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimulatedOutcome('lose');
                        setRoundKey((k) => k + 1);
                      }}
                      className={cx(
                        'cursor-pointer rounded-full px-2.5 py-0.5 transition-colors',
                        simulatedOutcome === 'lose'
                          ? 'bg-accent text-accent-foreground font-semibold'
                          : 'text-text-secondary hover:text-text-primary',
                      )}
                    >
                      {t('screens.lose')}
                    </button>
                  </div>
                )}

                {/* Smartphone Canvas Frame */}
                <PhoneMockup size="sm">
                  {currentDoc && (
                    <FitScreen
                      key={`${effectiveSkin.skinKey}-${activeScreen}`}
                      screen={currentDoc}
                      brand={effectiveSkin.brand}
                      stage={previewStage}
                      prizes={PREVIEW_PRIZES.map((p) => ({
                        id: p.id,
                        name: p.name,
                        image: p.image,
                        remaining: p.quantity,
                      }))}
                      onButton={(el) => {
                        if (el.action === 'start' || el.action === 'next') {
                          if (activeScreen === 'cover') setActiveScreen('game');
                          else if (activeScreen === 'form') setActiveScreen('game');
                          else setActiveScreen('cover');
                        }
                      }}
                      scroll
                      animate={0}
                    />
                  )}
                </PhoneMockup>
              </div>

              {/* Right Column: Template Info & Settings */}
              <div className="flex flex-1 flex-col justify-between overflow-y-auto">
                <div className="flex flex-col gap-6 p-6 lg:p-8">
                  {/* Overview */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-caption-1-medium text-text-tertiary">
                        {effectiveSkin.skinName}
                      </span>
                      <span className="text-text-tertiary">•</span>
                      <span className="text-caption-1-medium text-text-tertiary">
                        {displayTemplate.engineKind === 'instant'
                          ? t('instantWin')
                          : t('skillGame')}
                      </span>
                    </div>
                    <h3 className="text-title-1-semibold tracking-tight text-text-primary">
                      {displayTemplate.name}
                    </h3>
                    <p className="text-body-medium leading-relaxed text-text-secondary">
                      {displayTemplate.description}
                    </p>
                  </div>

                  {/* Expected Business Outcomes */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-caption-1-medium text-text-tertiary">
                      {t('expectedOutcomesTitle')}
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      {/* 1. Skins count */}
                      <Card variant="secondary" className="flex flex-col gap-1 p-3">
                        <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                          <RiPaletteLine className="size-3.5 text-accent-500" />
                          {t('availableSkinsTitle')}
                        </span>
                        <span className="text-body-semibold text-text-primary">
                          {displayTemplate.availableSkins.length}
                        </span>
                        <span className="text-[11px] leading-tight text-text-tertiary">
                          Tết · Khai trương · Quanh năm
                        </span>
                      </Card>

                      {/* 2. Setup time */}
                      <Card variant="secondary" className="flex flex-col gap-1 p-3">
                        <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                          <RiTimeLine className="size-3.5 text-text-secondary" />
                          {t('setupTime')}
                        </span>
                        <span className="text-body-semibold text-text-primary">
                          {displayTemplate.setupTime}
                        </span>
                        <span className="text-[11px] leading-tight text-text-tertiary">
                          {t('setupTimeHint')}
                        </span>
                      </Card>

                      {/* 3. Completion rate */}
                      <Card variant="secondary" className="flex flex-col gap-1 p-3">
                        <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                          <RiCheckDoubleLine className="size-3.5 text-emerald-500" />
                          {t('completionRate')}
                        </span>
                        <span className="text-body-semibold text-text-primary">
                          {displayTemplate.completionRate}
                        </span>
                        <span className="text-[11px] leading-tight text-text-tertiary">
                          {t('completionHint')}
                        </span>
                      </Card>
                    </div>
                  </div>

                  {/* Skin Variations */}
                  <Card variant="secondary" className="flex flex-col gap-2.5 p-4">
                    <span className="text-caption-1-medium text-text-tertiary">
                      {t('availableSkinsTitle')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {displayTemplate.availableSkins.map((s) => (
                        <button
                          type="button"
                          key={s.key}
                          onClick={() => setSelectedSkinKey(s.key)}
                          className={cx(
                            'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-caption-1-medium transition-all',
                            selectedSkinKey === s.key
                              ? 'border-accent-500 bg-surface font-medium text-text-primary shadow-xs'
                              : 'border-border text-text-secondary hover:border-border',
                          )}
                        >
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span>{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </Card>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card variant="secondary" className="flex flex-col gap-1.5 p-4">
                      <span className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
                        <RiTimeLine className="size-3.5 text-text-secondary" />
                        {t('recommendedDuration')}
                      </span>
                      <span className="text-body-semibold text-text-primary">
                        {displayTemplate.playDuration}
                      </span>
                      <span className="text-caption-2-regular text-text-tertiary">
                        {t('durationHint')}
                      </span>
                    </Card>

                    <Card variant="secondary" className="flex flex-col gap-1.5 p-4">
                      <span className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
                        <RiGiftLine className="size-3.5 text-text-secondary" />
                        {t('recommendedWinRate')}
                      </span>
                      <span className="text-body-semibold text-text-primary">
                        {displayTemplate.recommendedWinRate}
                      </span>
                      <span className="text-caption-2-regular text-text-tertiary">
                        {t('winRateHint')}
                      </span>
                    </Card>
                  </div>

                  {/* Compliance & Server Outcome */}
                  <Alert status="accent">
                    <Alert.Indicator>
                      <RiShieldCheckLine className="size-4" />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title>{t('complianceTitle')}</Alert.Title>
                      <Alert.Description>{t('complianceDesc')}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                </div>

                {/* Actions Sticky Footer */}
                <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-separator bg-surface px-6 py-4 lg:px-8">
                  <Button variant="secondary" size="sm" onPress={onClose}>
                    {t('close')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() =>
                      onUseTemplate({
                        ...displayTemplate,
                        skinKey: effectiveSkin.skinKey,
                        skinName: effectiveSkin.skinName,
                        brand: effectiveSkin.brand,
                      })
                    }
                  >
                    <RiMagicLine className="size-4" />
                    {t('useThisTemplate')}
                  </Button>
                </div>
              </div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
