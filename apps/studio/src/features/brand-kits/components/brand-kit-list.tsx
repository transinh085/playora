'use client';

import type { BrandKitSummary } from '@playora/contracts';
import { Button, Card, Tag } from 'antd';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
      <p className="rounded-lg border border-dashed border-[var(--ant-color-border)] p-10 text-center text-[var(--ant-color-text-secondary)]">
        {t('brandKits.empty')}
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((kit) => (
        <Card
          key={kit.id}
          title={<span className="text-base font-semibold">{kit.name}</span>}
          extra={
            <div className="flex items-center gap-1.5">
              {COLOR_SLOTS.map((slot) => {
                const color = kit.tokens.colors[slot];
                if (!color) return null;
                return (
                  <span
                    key={slot}
                    className="size-5 rounded-full border border-[var(--ant-color-border)]"
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {kit.tokens.fontHeading && <Tag className="m-0">{kit.tokens.fontHeading}</Tag>}
              {kit.tokens.fontBody && <Tag className="m-0">{kit.tokens.fontBody}</Tag>}
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--ant-color-border-secondary)] pt-3">
              <Button
                htmlType="button"
                size="small"
                icon={<Pencil className="size-3.5" />}
                onClick={() => onEdit(kit)}
              >
                {t('brandKits.edit')}
              </Button>
              <Button
                htmlType="button"
                type="text"
                danger
                size="small"
                icon={<Trash2 className="size-4" />}
                aria-label={t('common.delete')}
                disabled={isRemoving}
                onClick={() => onRemove(kit.id)}
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
