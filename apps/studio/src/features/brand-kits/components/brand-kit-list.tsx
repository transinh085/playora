'use client';

import type { BrandKitSummary } from '@playora/contracts';
import { Button, Card, Divider, Flex, Tag, Typography, theme } from 'antd';
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
  const { token } = theme.useToken();
  const cardStyle = { border: `1px solid ${token.colorBorderSecondary}` };

  if (items.length === 0) {
    return (
      <EmptyState icon={Palette} title={t('brandKits.empty')} description={t('brandKits.title')} />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((kit) => (
        <Card
          key={kit.id}
          variant="borderless"
          style={cardStyle}
          styles={{ body: { padding: '16px 20px' } }}
        >
          <Flex align="center" gap={12}>
            <IconTile>
              <Palette className="size-5" />
            </IconTile>
            <div className="min-w-0 flex-1">
              <Typography.Text strong ellipsis className="block" style={{ fontSize: 15 }}>
                {kit.name}
              </Typography.Text>
              <Flex align="center" gap={6} className="mt-1.5">
                {COLOR_SLOTS.map((slot) => {
                  const color = kit.tokens.colors[slot];
                  if (!color) return null;
                  return (
                    <span
                      key={slot}
                      className="size-5 shrink-0"
                      style={{
                        backgroundColor: color,
                        borderRadius: token.borderRadiusSM,
                        border: `1px solid ${token.colorBorder}`,
                      }}
                    />
                  );
                })}
              </Flex>
            </div>
          </Flex>

          {(kit.tokens.fontHeading || kit.tokens.fontBody) && (
            <Flex wrap gap={8} className="mt-3">
              {kit.tokens.fontHeading && (
                <Tag variant="filled" className="!m-0">
                  {kit.tokens.fontHeading}
                </Tag>
              )}
              {kit.tokens.fontBody && (
                <Tag variant="filled" className="!m-0">
                  {kit.tokens.fontBody}
                </Tag>
              )}
            </Flex>
          )}

          <Divider size="small" />

          <Flex justify="end" gap={8}>
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
          </Flex>
        </Card>
      ))}
    </div>
  );
}
