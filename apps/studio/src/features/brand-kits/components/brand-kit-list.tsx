'use client';

import type { BrandKitSummary } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import { Palette, Pencil, Trash2 } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/empty-state';
import { IconTile } from '@/components/icon-tile';

const COLOR_SLOTS = ['primary', 'secondary', 'background', 'text'] as const;

export function BrandKitList({
  items,
  isRemoving,
  onEdit,
  onRemove,
}: {
  items: BrandKitSummary[];
  isRemoving: boolean;
  onEdit: (kit: BrandKitSummary) => void;
  onRemove: (brandKitId: string) => void;
}) {
  const t = useTranslations();

  if (items.length === 0) {
    return (
      <EmptyState icon={Palette} title={t('brandKits.empty')} description={t('brandKits.title')} />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs divide-y divide-neutral-200 dark:border-white/10 dark:bg-[#0A0A0A] dark:divide-white/10">
      {items.map((kit) => (
        <div
          key={kit.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <IconTile tone="primary">
              <Palette className="size-4" />
            </IconTile>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="truncate text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
                  {kit.name}
                </span>
                <div className="flex items-center gap-1">
                  {COLOR_SLOTS.map((slot) => {
                    const color = kit.tokens.colors[slot];
                    if (!color) return null;
                    return (
                      <span
                        key={slot}
                        className="size-3.5 shrink-0 rounded-sm border border-neutral-200 dark:border-white/10 shadow-xs"
                        style={{ backgroundColor: color }}
                        title={`${slot}: ${color}`}
                      />
                    );
                  })}
                </div>
              </div>
              {(kit.tokens.fontHeading || kit.tokens.fontBody) && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-[#A3A3A3]">
                  {kit.tokens.fontHeading && (
                    <span>
                      Heading:{' '}
                      <span className="font-medium text-neutral-700 dark:text-[#D4D4D4]">
                        {kit.tokens.fontHeading}
                      </span>
                    </span>
                  )}
                  {kit.tokens.fontHeading && kit.tokens.fontBody && (
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  )}
                  {kit.tokens.fontBody && (
                    <span>
                      Body:{' '}
                      <span className="font-medium text-neutral-700 dark:text-[#D4D4D4]">
                        {kit.tokens.fontBody}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-md gap-1.5 px-2.5 text-xs shadow-xs"
              onClick={() => onEdit(kit)}
            >
              <Pencil className="size-3" />
              {t('brandKits.edit')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={t('common.delete')}
              disabled={isRemoving}
              onClick={() => onRemove(kit.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
