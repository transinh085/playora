'use client';

import type { BrandKitSummary } from '@playora/contracts';
import { Button } from '@playora/ui/components/base/buttons/button';
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
    <div className="divide-y divide-separator-border overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
      {items.map((kit) => (
        <div
          key={kit.id}
          className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-background-primary-hover sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <IconTile tone="primary">
              <Palette className="size-4" />
            </IconTile>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="truncate text-body-medium text-text-primary">{kit.name}</span>
                <div className="flex items-center gap-1">
                  {COLOR_SLOTS.map((slot) => {
                    const color = kit.tokens.colors[slot];
                    if (!color) return null;
                    return (
                      <span
                        key={slot}
                        className="size-3.5 shrink-0 rounded-sm border border-border-button-default shadow-2xs"
                        style={{ backgroundColor: color }}
                        title={`${slot}: ${color}`}
                      />
                    );
                  })}
                </div>
              </div>
              {(kit.tokens.fontHeading || kit.tokens.fontBody) && (
                <div className="mt-1 flex items-center gap-1.5 text-caption-1-medium text-text-secondary">
                  {kit.tokens.fontHeading && (
                    <span>
                      Heading: <span className="text-text-primary">{kit.tokens.fontHeading}</span>
                    </span>
                  )}
                  {kit.tokens.fontHeading && kit.tokens.fontBody && (
                    <span className="text-text-tertiary">·</span>
                  )}
                  {kit.tokens.fontBody && (
                    <span>
                      Body: <span className="text-text-primary">{kit.tokens.fontBody}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="secondary"
              size="small"
              leadingIcon={Pencil}
              onClick={() => onEdit(kit)}
            >
              {t('brandKits.edit')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={Trash2}
              className="text-text-error-primary hover:bg-notification-error-background"
              aria-label={t('common.delete')}
              disabled={isRemoving}
              onClick={() => onRemove(kit.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
