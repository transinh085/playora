'use client';

import {
  Button,
  Card,
  ListBox,
  SearchField,
  Select,
  Separator,
  Tabs,
} from '@playora/ui/components';
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
    <Card className="flex flex-col gap-3 border-[0.5px] border-border-card-default bg-background-secondary-default p-4 shadow-xs">
      {/* Top row: Search input + Occasion pills + Saved filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <SearchField
            aria-label={t('searchPlaceholder')}
            value={filters.query}
            onChange={(val) => onChange({ query: val })}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('searchPlaceholder')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        {/* Occasion quick pills switcher + Saved filter button */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none lg:pb-0">
          <Tabs
            selectedKey={filters.onlySaved ? '' : filters.occasion}
            onSelectionChange={(key) =>
              onChange({ occasion: String(key) as TemplateOccasion, onlySaved: false })
            }
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label={t('filterBy')}>
                {OCCASIONS.map((occ) => (
                  <Tabs.Tab key={occ.key} id={occ.key}>
                    {t(`occasions.${occ.labelKey}`)}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          <Separator orientation="vertical" className="h-4 shrink-0" />

          <Button
            variant={filters.onlySaved ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => onChange({ onlySaved: !filters.onlySaved })}
            className="shrink-0"
          >
            {filters.onlySaved ? (
              <RiBookmarkFill className="size-4" />
            ) : (
              <RiBookmarkLine className="size-4" />
            )}
            {t('savedTab', { count: savedCount })}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Bottom row: Detailed dropdown filters + Sort + Count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-caption-1-medium text-text-tertiary">
            <RiFilter3Line className="size-3.5" />
            {t('filterBy')}:
          </span>

          {/* Mechanic Filter */}
          <div className="w-40">
            <Select
              aria-label={t('mechanicLabel')}
              selectedKey={filters.mechanic}
              onSelectionChange={(key) =>
                key !== null && onChange({ mechanic: key as TemplateMechanic })
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {MECHANICS.map((m) => (
                    <ListBox.Item key={m.key} id={m.key} textValue={t(`mechanics.${m.labelKey}`)}>
                      {t(`mechanics.${m.labelKey}`)}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* Vertical Filter */}
          <div className="w-40">
            <Select
              aria-label={t('verticalLabel')}
              selectedKey={filters.vertical}
              onSelectionChange={(key) =>
                key !== null && onChange({ vertical: key as TemplateVertical })
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {VERTICALS.map((v) => (
                    <ListBox.Item key={v.key} id={v.key} textValue={t(`verticals.${v.labelKey}`)}>
                      {t(`verticals.${v.labelKey}`)}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* Goal Filter */}
          <div className="w-44">
            <Select
              aria-label={t('goalLabel')}
              selectedKey={filters.goal}
              onSelectionChange={(key) => key !== null && onChange({ goal: key as TemplateGoal })}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {GOALS.map((g) => (
                    <ListBox.Item key={g.key} id={g.key} textValue={t(`goals.${g.labelKey}`)}>
                      {t(`goals.${g.labelKey}`)}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onPress={onReset}
              className="text-text-tertiary hover:text-text-primary"
            >
              <RiRestartLine className="size-4" />
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
              aria-label={t('sortLabel')}
              selectedKey={filters.sortBy}
              onSelectionChange={(key) =>
                key !== null && onChange({ sortBy: key as 'popularity' | 'newest' | 'duration' })
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="popularity" textValue={t('sort.popularity')}>
                    {t('sort.popularity')}
                  </ListBox.Item>
                  <ListBox.Item id="newest" textValue={t('sort.newest')}>
                    {t('sort.newest')}
                  </ListBox.Item>
                  <ListBox.Item id="duration" textValue={t('sort.duration')}>
                    {t('sort.duration')}
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
}
