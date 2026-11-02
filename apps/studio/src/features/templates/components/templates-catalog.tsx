'use client';

import { Sparkles } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import {
  type CatalogTemplate,
  MOCK_TEMPLATES,
  type TemplateGoal,
  type TemplateOccasion,
} from '../data/mock-templates';
import { useSavedTemplates } from '../hooks/use-saved-templates';
import { CreateFromTemplateDialog } from './create-from-template-dialog';
import { TemplateCard } from './template-card';
import { TemplatePreviewDrawer } from './template-preview-drawer';
import { type TemplateFilterState, TemplateToolbar } from './template-toolbar';

const INITIAL_FILTERS: TemplateFilterState = {
  query: '',
  occasion: 'all',
  mechanic: 'all',
  vertical: 'all',
  goal: 'all',
  sortBy: 'popularity',
  onlySaved: false,
};

const QUICK_GOALS: {
  key: 'all' | 'traffic' | 'retention' | 'clearance' | 'tet' | 'opening';
  goal: TemplateGoal;
  occasion: TemplateOccasion;
}[] = [
  { key: 'all', goal: 'all', occasion: 'all' },
  { key: 'traffic', goal: 'traffic', occasion: 'all' },
  { key: 'retention', goal: 'retention', occasion: 'all' },
  { key: 'clearance', goal: 'clearance', occasion: 'all' },
  { key: 'tet', goal: 'all', occasion: 'tet' },
  { key: 'opening', goal: 'all', occasion: 'opening' },
];

export function TemplatesCatalog({
  orgId,
  hideHero = false,
}: {
  orgId: string;
  hideHero?: boolean;
}) {
  const t = useTranslations('templatesCatalog');
  const [filters, setFilters] = useState<TemplateFilterState>(INITIAL_FILTERS);
  const [previewTemplate, setPreviewTemplate] = useState<CatalogTemplate | null>(null);
  const [createTemplate, setCreateTemplate] = useState<CatalogTemplate | null>(null);
  const { savedIds, savedCount, toggleSave, isSaved } = useSavedTemplates(orgId);

  const handleFilterChange = (patch: Partial<TemplateFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const activeQuickGoal = useMemo(() => {
    if (filters.occasion === 'tet') return 'tet';
    if (filters.occasion === 'opening') return 'opening';
    if (filters.goal === 'traffic') return 'traffic';
    if (filters.goal === 'retention') return 'retention';
    if (filters.goal === 'clearance') return 'clearance';
    if (filters.goal === 'all' && filters.occasion === 'all') return 'all';
    return null;
  }, [filters.goal, filters.occasion]);

  // Filter & sort logic
  const filteredTemplates = useMemo(() => {
    return MOCK_TEMPLATES.filter((tpl) => {
      // 0. Only Saved
      if (filters.onlySaved && !savedIds.has(tpl.id)) {
        return false;
      }

      // 1. Text Query
      if (filters.query.trim()) {
        const q = filters.query.toLowerCase().trim();
        const matchName = tpl.name.toLowerCase().includes(q);
        const matchDesc = tpl.description.toLowerCase().includes(q);
        const matchSkin = tpl.skinName.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchSkin) {
          return false;
        }
      }

      // 2. Occasion
      if (filters.occasion !== 'all' && tpl.occasion !== filters.occasion) {
        return false;
      }

      // 3. Mechanic
      if (filters.mechanic !== 'all' && tpl.mechanic !== filters.mechanic) {
        return false;
      }

      // 4. Vertical
      if (filters.vertical !== 'all' && tpl.vertical !== filters.vertical) {
        return false;
      }

      // 5. Goal
      if (filters.goal !== 'all' && tpl.goal !== filters.goal) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'duration') {
        return a.playDuration.localeCompare(b.playDuration);
      }
      if (filters.sortBy === 'newest') {
        return b.id.localeCompare(a.id);
      }
      return 0;
    });
  }, [filters, savedIds]);

  return (
    <div className="flex flex-col gap-6">
      {/* 0. ORA Mascot Hero Banner */}
      {!hideHero && (
        <section className="relative overflow-hidden rounded-3xl border border-border-card-default bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-amber-500/10 p-5 sm:p-7 shadow-xs">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 size-48 rounded-full bg-amber-500/10 blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-xl text-center md:text-left items-center md:items-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-caption-1-medium text-teal-700 dark:text-teal-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-teal-500" />
                </span>
                <span>{t('hero.badge')}</span>
              </div>

              <h2 className="text-title-1-semibold sm:text-display-xs-semibold tracking-tight text-text-primary">
                {t('hero.greeting')}
              </h2>

              <p className="text-body-medium text-text-secondary leading-relaxed">
                {t('hero.subtitle')}
              </p>

              {/* Quick Goal Filter Chips */}
              <div className="mt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
                {QUICK_GOALS.map((qg) => {
                  const isActive = activeQuickGoal === qg.key;
                  return (
                    <button
                      key={qg.key}
                      type="button"
                      onClick={() => {
                        if (qg.key === 'all') {
                          handleFilterChange({ goal: 'all', occasion: 'all' });
                        } else if (qg.key === 'tet' || qg.key === 'opening') {
                          handleFilterChange({ occasion: qg.occasion, goal: 'all' });
                        } else {
                          handleFilterChange({ goal: qg.goal, occasion: 'all' });
                        }
                      }}
                      className={cx(
                        'inline-flex items-center rounded-xl px-3.5 py-1.5 text-caption-1-medium transition-all cursor-pointer shadow-2xs',
                        isActive
                          ? 'bg-accent-500 text-white font-semibold shadow-xs ring-2 ring-accent-500/30'
                          : 'bg-background-primary-default border border-border-card-default text-text-secondary hover:text-text-primary hover:border-border-card-hover hover:bg-background-secondary-default',
                      )}
                    >
                      {t(`hero.quickGoals.${qg.key}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ORA Host Mascot Graphic */}
            <div className="shrink-0 flex items-center justify-center">
              {/* biome-ignore lint/performance/noImgElement: static public mascot graphic */}
              <img
                src="/assets/ora-host.png"
                alt="Rái cá ORA"
                className="h-36 sm:h-44 md:h-48 w-auto object-contain drop-shadow-md select-none transition-transform hover:scale-105 duration-300"
              />
            </div>
          </div>
        </section>
      )}

      {/* 1. Filter & Search Toolbar */}
      <TemplateToolbar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        totalCount={MOCK_TEMPLATES.length}
        filteredCount={filteredTemplates.length}
        savedCount={savedCount}
      />

      {/* 2. Template Grid (5-column preview-focused catalog) */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSaved={isSaved(template.id)}
              onToggleSave={toggleSave}
              onPreview={(tpl) => setPreviewTemplate(tpl)}
              onUse={(tpl) => setCreateTemplate(tpl)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title={filters.onlySaved ? t('empty.savedTitle') : t('empty.title')}
          description={filters.onlySaved ? t('empty.savedDescription') : t('empty.description')}
          actionText={filters.onlySaved ? t('empty.showAllAction') : t('empty.resetAction')}
          onAction={handleResetFilters}
        />
      )}

      {/* 4. Interactive Preview Drawer */}
      <TemplatePreviewDrawer
        template={previewTemplate}
        isOpen={Boolean(previewTemplate)}
        isSaved={previewTemplate ? isSaved(previewTemplate.id) : false}
        onToggleSave={toggleSave}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={(tpl) => {
          setPreviewTemplate(null);
          setCreateTemplate(tpl);
        }}
      />

      {/* 5. Create Campaign Modal */}
      <CreateFromTemplateDialog
        orgId={orgId}
        template={createTemplate}
        isOpen={Boolean(createTemplate)}
        onClose={() => setCreateTemplate(null)}
      />
    </div>
  );
}
