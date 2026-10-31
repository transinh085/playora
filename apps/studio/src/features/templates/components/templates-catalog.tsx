'use client';

import { Sparkles } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { type CatalogTemplate, MOCK_TEMPLATES } from '../data/mock-templates';
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

export function TemplatesCatalog({ orgId }: { orgId: string }) {
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
