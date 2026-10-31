'use client';

import type { BrandKitSummary } from '@playora/contracts';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent } from '@playora/ui/components/card';
import { Separator } from '@playora/ui/components/separator';
import { Palette, Pencil, Trash2 } from 'lucide-react';
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
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((kit) => (
        <Card key={kit.id} className="rounded-2xl border">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <IconTile>
                <Palette className="size-5" />
              </IconTile>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{kit.name}</span>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {COLOR_SLOTS.map((slot) => {
                    const color = kit.tokens.colors[slot];
                    if (!color) return null;
                    return (
                      <span
                        key={slot}
                        className="size-5 shrink-0 rounded-md border border-border"
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {(kit.tokens.fontHeading || kit.tokens.fontBody) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {kit.tokens.fontHeading && (
                  <Badge variant="secondary" className="font-normal">
                    {kit.tokens.fontHeading}
                  </Badge>
                )}
                {kit.tokens.fontBody && (
                  <Badge variant="secondary" className="font-normal">
                    {kit.tokens.fontBody}
                  </Badge>
                )}
              </div>
            )}

            <Separator className="my-3.5" />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => onEdit(kit)}
              >
                <Pencil className="size-3.5" />
                {t('brandKits.edit')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={t('common.delete')}
                disabled={isRemoving}
                onClick={() => onRemove(kit.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
