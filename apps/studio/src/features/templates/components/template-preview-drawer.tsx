'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { CloseButton } from '@playora/ui/components/base/buttons/close-button';
import { Drawer } from '@playora/ui/components/base/drawer/drawer';
import { PillTab, PillTabList } from '@playora/ui/components/base/tabs/pill-tab';
import { cx } from '@playora/ui/utils/cx';
import {
  RiBookmarkFill,
  RiBookmarkLine,
  RiCheckDoubleLine,
  RiFireLine,
  RiGiftLine,
  RiMagicLine,
  RiShieldCheckLine,
  RiTimeLine,
} from '@remixicon/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FitScreen } from '@/features/builder-lab/components/editor/fit-screen';
import type { ScreenKey } from '@/features/canvas-editor/lib/model';
import type { CatalogTemplate } from '../data/mock-templates';

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
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('cover');
  const [selectedSkinKey, setSelectedSkinKey] = useState<string>('');

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
    }
  }, [template]);

  if (!displayTemplate) return null;

  const currentDoc = displayTemplate.screens[activeScreen];

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="end"
      size="2xl"
      modalClassName="max-w-[960px] xl:max-w-[1040px]"
      className="p-0"
    >
      <div className="flex h-full flex-col bg-background-primary-default">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border-card-default px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-body-1-semibold text-text-primary">{displayTemplate.name}</h2>
            <Chip
              color={displayTemplate.engineKind === 'instant' ? 'cyan' : 'purple'}
              variant="caption"
            >
              {displayTemplate.engineKind === 'instant' ? t('instantWin') : t('skillGame')}
            </Chip>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={effectiveSaved ? 'primary' : 'secondary'}
              size="small"
              leadingIcon={effectiveSaved ? RiBookmarkFill : RiBookmarkLine}
              onClick={() => onToggleSave?.(displayTemplate.id)}
            >
              {effectiveSaved ? t('saved') : t('save')}
            </Button>
            <CloseButton aria-label={t('close')} onClick={onClose} />
          </div>
        </div>

        {/* Drawer Body - Split View (Phone Canvas on Left, Specs on Right) */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Left Column: Phone Canvas Preview */}
          <div className="flex flex-col items-center justify-center border-b border-border-card-default bg-background-tertiary-default/50 p-6 lg:w-[440px] lg:shrink-0 lg:border-b-0 lg:border-r overflow-y-auto">
            {/* Screen Switcher */}
            <div className="mb-5 shrink-0">
              <PillTabList>
                <PillTab
                  variant="gray"
                  isSelected={activeScreen === 'cover'}
                  onSelect={() => setActiveScreen('cover')}
                >
                  {t('screens.cover')}
                </PillTab>
                <PillTab
                  variant="gray"
                  isSelected={activeScreen === 'game'}
                  onSelect={() => setActiveScreen('game')}
                >
                  {t('screens.game')}
                </PillTab>
                <PillTab
                  variant="gray"
                  isSelected={activeScreen === 'resultWin'}
                  onSelect={() => setActiveScreen('resultWin')}
                >
                  {t('screens.win')}
                </PillTab>
                <PillTab
                  variant="gray"
                  isSelected={activeScreen === 'resultLose'}
                  onSelect={() => setActiveScreen('resultLose')}
                >
                  {t('screens.lose')}
                </PillTab>
              </PillTabList>
            </div>

            {/* Smartphone Canvas Frame */}
            <div
              className="relative shrink-0 overflow-hidden rounded-[36px] border-[7px] border-neutral-900 bg-background shadow-2xl transition-all"
              style={{
                width: 'min(300px, 100%)',
                aspectRatio: '9 / 18.5',
              }}
            >
              {/* Dynamic Island */}
              <div className="pointer-events-none absolute left-1/2 top-2 z-30 h-3.5 w-20 -translate-x-1/2 rounded-full bg-neutral-900" />

              {/* Canvas Rendering */}
              <div className="size-full overflow-hidden">
                {currentDoc && (
                  <FitScreen
                    key={activeScreen}
                    screen={currentDoc}
                    brand={displayTemplate.brand}
                    scroll
                    animate={0}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Template Info & Settings */}
          <div className="flex flex-1 flex-col justify-between overflow-y-auto">
            <div className="flex flex-col gap-6 p-6 lg:p-8">
              {/* Overview */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-caption-1-medium text-text-tertiary">
                    {displayTemplate.skinName}
                  </span>
                  <span className="text-text-tertiary">•</span>
                  <span className="text-caption-1-medium text-text-tertiary">
                    {displayTemplate.engineKind === 'instant' ? t('instantWin') : t('skillGame')}
                  </span>
                </div>
                <h3 className="text-title-1-semibold tracking-tight text-text-primary">
                  {displayTemplate.name}
                </h3>
                <p className="text-body-medium text-text-secondary leading-relaxed">
                  {displayTemplate.description}
                </p>
              </div>

              {/* Expected Business Outcomes */}
              <div className="flex flex-col gap-2.5">
                <span className="text-caption-1-medium text-text-tertiary">
                  {t('expectedOutcomesTitle')}
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {/* 1. Usage Count */}
                  <div className="flex flex-col gap-1 rounded-xl border border-border-card-default bg-background-secondary-default p-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                      <RiFireLine className="size-3.5 text-orange-500 fill-orange-500" />
                      {t('usageCount')}
                    </span>
                    <span className="text-body-1-semibold text-text-primary">
                      {displayTemplate.usageCount}+
                    </span>
                    <span className="text-[11px] text-text-tertiary leading-tight">
                      {t('usageHint')}
                    </span>
                  </div>

                  {/* 2. Setup time */}
                  <div className="flex flex-col gap-1 rounded-xl border border-border-card-default bg-background-secondary-default p-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                      <RiTimeLine className="size-3.5 text-text-secondary" />
                      {t('setupTime')}
                    </span>
                    <span className="text-body-1-semibold text-text-primary">
                      {displayTemplate.setupTime}
                    </span>
                    <span className="text-[11px] text-text-tertiary leading-tight">
                      {t('setupTimeHint')}
                    </span>
                  </div>

                  {/* 3. Completion rate */}
                  <div className="flex flex-col gap-1 rounded-xl border border-border-card-default bg-background-secondary-default p-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                      <RiCheckDoubleLine className="size-3.5 text-emerald-500" />
                      {t('completionRate')}
                    </span>
                    <span className="text-body-1-semibold text-text-primary">
                      {displayTemplate.completionRate}
                    </span>
                    <span className="text-[11px] text-text-tertiary leading-tight">
                      {t('completionHint')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Skin Variations */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-border-card-default bg-background-secondary-default p-4">
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
                        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-caption-1-medium transition-all cursor-pointer',
                        selectedSkinKey === s.key
                          ? 'border-accent-500 bg-background-primary-default text-text-primary font-medium shadow-xs'
                          : 'border-border-card-default text-text-secondary hover:border-border-card-hover',
                      )}
                    >
                      <span className="size-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 rounded-xl border border-border-card-default bg-background-secondary-default p-4">
                  <span className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
                    <RiTimeLine className="size-3.5 text-text-secondary" />
                    {t('recommendedDuration')}
                  </span>
                  <span className="text-body-1-semibold text-text-primary">
                    {displayTemplate.playDuration}
                  </span>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {t('durationHint')}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 rounded-xl border border-border-card-default bg-background-secondary-default p-4">
                  <span className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
                    <RiGiftLine className="size-3.5 text-text-secondary" />
                    {t('recommendedWinRate')}
                  </span>
                  <span className="text-body-1-semibold text-text-primary">
                    {displayTemplate.recommendedWinRate}
                  </span>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {t('winRateHint')}
                  </span>
                </div>
              </div>

              {/* Compliance & Server Outcome */}
              <div className="flex items-start gap-3 rounded-xl border border-border-card-default bg-background-secondary-default p-4 text-caption-1-regular text-text-secondary">
                <RiShieldCheckLine className="size-4 shrink-0 text-text-tertiary mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-text-primary">{t('complianceTitle')}</span>
                  <p className="text-caption-2-regular text-text-tertiary leading-relaxed">
                    {t('complianceDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Sticky Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border-card-default bg-background-primary-default px-6 py-4 lg:px-8">
              <Button variant="secondary" size="small" onClick={onClose}>
                {t('close')}
              </Button>
              <Button
                variant="primary"
                size="small"
                leadingIcon={RiMagicLine}
                onClick={() => onUseTemplate(displayTemplate)}
              >
                {t('useThisTemplate')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
