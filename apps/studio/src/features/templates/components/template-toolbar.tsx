'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { SearchField } from '@playora/ui/components/base/search-field/search-field';
import { Select, SelectItem } from '@playora/ui/components/base/select/select';
import { PillTab, PillTabList } from '@playora/ui/components/base/tabs/pill-tab';
import { RiBookmarkFill, RiBookmarkLine, RiFilter3Line, RiRestartLine } from '@remixicon/react';
import { useTranslations } from 'next-intl';
import type {
  TemplateGoal,
  TemplateMechanic,
  TemplateOccasion,
  TemplateVertical,
} from '../data/mock-templates';

export interface TemplateFilterState {
  query: string;
  occasion: TemplateOccasion;
  mechanic: TemplateMechanic;
  vertical: TemplateVertical;
  goal: TemplateGoal;
  sortBy: 'popularity' | 'newest' | 'duration';
  onlySaved?: boolean;
}

const OCCASIONS: { key: TemplateOccasion; labelKey: string }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'tet', labelKey: 'tet' },
  { key: 'opening', labelKey: 'opening' },
  { key: 'everyday', labelKey: 'everyday' },
];

const MECHANICS: { key: TemplateMechanic; labelKey: string }[] = [
  { key: 'all', labelKey: 'allMechanics' },
  { key: 'spin-wheel', labelKey: 'spinWheel' },
  { key: 'scratch-card', labelKey: 'scratchCard' },
  { key: 'gift-box', labelKey: 'giftBox' },
  { key: 'egg-smash', labelKey: 'eggSmash' },
  { key: 'catch-items', labelKey: 'catchItems' },
  { key: 'memory-match', labelKey: 'memoryMatch' },
  { key: 'lucky-envelope', labelKey: 'luckyEnvelope' },
];

const VERTICALS: { key: TemplateVertical; labelKey: string }[] = [
  { key: 'all', labelKey: 'allVerticals' },
  { key: 'fnb', labelKey: 'fnb' },
  { key: 'cafe-milktea', labelKey: 'cafeMilktea' },
  { key: 'restaurant', labelKey: 'restaurant' },
  { key: 'retail', labelKey: 'retail' },
  { key: 'beauty', labelKey: 'beauty' },
];

const GOALS: { key: TemplateGoal; labelKey: string }[] = [
  { key: 'all', labelKey: 'allGoals' },
  { key: 'traffic', labelKey: 'traffic' },
  { key: 'retention', labelKey: 'retention' },
  { key: 'leads', labelKey: 'leads' },
  { key: 'clearance', labelKey: 'clearance' },
];

export function TemplateToolbar({
  filters,
  onChange,
  onReset,
  totalCount,
  filteredCount,
  savedCount = 0,
}: {
  filters: TemplateFilterState;
  onChange: (patch: Partial<TemplateFilterState>) => void;
  onReset: () => void;
  totalCount: number;
  filteredCount: number;
  savedCount?: number;
}) {
  const t = useTranslations('templatesCatalog.toolbar') as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;

  const hasActiveFilters =
    Boolean(filters.onlySaved) ||
    filters.query.trim() !== '' ||
    filters.occasion !== 'all' ||
    filters.mechanic !== 'all' ||
    filters.vertical !== 'all' ||
    filters.goal !== 'all';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-[0.5px] border-border-card-default bg-background-secondary-default p-4 shadow-xs">
      {/* Top row: Search input + Occasion pills + Saved filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <SearchField
            aria-label={t('searchPlaceholder')}
            placeholder={t('searchPlaceholder')}
            value={filters.query}
            onChange={(val) => onChange({ query: val })}
            shape="rounded"
            size="small"
          />
        </div>

        {/* Occasion quick pills switcher + Saved filter button */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <PillTabList>
            {OCCASIONS.map((occ) => (
              <PillTab
                key={occ.key}
                variant="gray"
                isSelected={!filters.onlySaved && filters.occasion === occ.key}
                onSelect={() => onChange({ occasion: occ.key, onlySaved: false })}
              >
                {t(`occasions.${occ.labelKey}`)}
              </PillTab>
            ))}
          </PillTabList>

          <div className="h-4 w-px bg-border-card-default shrink-0" />

          <Button
            variant={filters.onlySaved ? 'primary' : 'secondary'}
            size="small"
            leadingIcon={filters.onlySaved ? RiBookmarkFill : RiBookmarkLine}
            onClick={() => onChange({ onlySaved: !filters.onlySaved })}
            className="shrink-0"
          >
            {t('savedTab', { count: savedCount })}
          </Button>
        </div>
      </div>

      {/* Bottom row: Detailed dropdown filters + Sort + Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-card-default pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-caption-1-medium text-text-tertiary">
            <RiFilter3Line className="size-3.5" />
            {t('filterBy')}:
          </span>

          {/* Mechanic Filter */}
          <div className="w-40">
            <Select
              size="sm"
              aria-label={t('mechanicLabel')}
              selectedKey={filters.mechanic}
              onSelectionChange={(key) =>
                key !== null && onChange({ mechanic: key as TemplateMechanic })
              }
            >
              {MECHANICS.map((m) => (
                <SelectItem key={m.key} id={m.key} textValue={t(`mechanics.${m.labelKey}`)}>
                  {t(`mechanics.${m.labelKey}`)}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Vertical Filter */}
          <div className="w-40">
            <Select
              size="sm"
              aria-label={t('verticalLabel')}
              selectedKey={filters.vertical}
              onSelectionChange={(key) =>
                key !== null && onChange({ vertical: key as TemplateVertical })
              }
            >
              {VERTICALS.map((v) => (
                <SelectItem key={v.key} id={v.key} textValue={t(`verticals.${v.labelKey}`)}>
                  {t(`verticals.${v.labelKey}`)}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Goal Filter */}
          <div className="w-44">
            <Select
              size="sm"
              aria-label={t('goalLabel')}
              selectedKey={filters.goal}
              onSelectionChange={(key) => key !== null && onChange({ goal: key as TemplateGoal })}
            >
              {GOALS.map((g) => (
                <SelectItem key={g.key} id={g.key} textValue={t(`goals.${g.labelKey}`)}>
                  {t(`goals.${g.labelKey}`)}
                </SelectItem>
              ))}
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="small"
              leadingIcon={RiRestartLine}
              onClick={onReset}
              className="text-text-tertiary hover:text-text-primary"
            >
              {t('reset')}
            </Button>
          )}
        </div>

        {/* Right side: Sort + Results counter */}
        <div className="flex items-center gap-3">
          <span className="text-caption-1-regular text-text-tertiary">
            {t('showingCount', { current: filteredCount, total: totalCount })}
          </span>

          <div className="w-36">
            <Select
              size="sm"
              aria-label={t('sortLabel')}
              selectedKey={filters.sortBy}
              onSelectionChange={(key) =>
                key !== null && onChange({ sortBy: key as 'popularity' | 'newest' | 'duration' })
              }
            >
              <SelectItem id="popularity" textValue={t('sort.popularity')}>
                {t('sort.popularity')}
              </SelectItem>
              <SelectItem id="newest" textValue={t('sort.newest')}>
                {t('sort.newest')}
              </SelectItem>
              <SelectItem id="duration" textValue={t('sort.duration')}>
                {t('sort.duration')}
              </SelectItem>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
