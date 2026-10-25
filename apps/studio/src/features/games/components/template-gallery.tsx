'use client';

import {
  type GameKind,
  localize,
  type TemplateSkinSummary,
  type TemplateSummary,
} from '@playora/contracts';
import { Button, Card, Empty, Flex, Segmented, Skeleton, Tag, Typography, theme } from 'antd';
import { Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Caption } from '@/components/caption';
import { QueryError } from '@/components/query-error';
import { useBrandKits } from '@/features/brand-kits/api';
import { useTemplates } from '../api';
import { DEFAULT_BRAND_PAYLOAD, resolveBrandPayload } from '../lib/builder-helpers';
import { QuickCreateDialog } from './quick-create-dialog';
import { TemplatePreview } from './template-preview';

const NO_ASSETS: Record<string, string> = {};
/** Skin tags with a translated label; other tags are shown as-is. */
const OCCASIONS = ['tet', 'chung'] as const;
type Occasion = (typeof OCCASIONS)[number];
const isOccasion = (tag: string): tag is Occasion => (OCCASIONS as readonly string[]).includes(tag);

/** One gallery card per template × skin: one mechanic in many looks (docs/12 §5, docs/14 §1). */
interface GalleryItem {
  key: string;
  template: TemplateSummary;
  skin: TemplateSkinSummary;
}

export function TemplateGallery({ orgId }: { orgId: string }) {
  const t = useTranslations('templates');
  const locale = useLocale() as 'vi' | 'en';
  const { token } = theme.useToken();
  const templatesQuery = useTemplates();
  const brandKitsQuery = useBrandKits(orgId);
  const [occasion, setOccasion] = useState<string>('all');
  const [kind, setKind] = useState<GameKind | 'all'>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const brandKits = brandKitsQuery.data?.items ?? [];
  // Previews wear the organization's first brand kit, so the owner sees their own colours.
  const brand = useMemo(
    () => (brandKits[0] ? resolveBrandPayload(brandKits[0], NO_ASSETS) : DEFAULT_BRAND_PAYLOAD),
    [brandKits],
  );

  const items = useMemo<GalleryItem[]>(
    () =>
      (templatesQuery.data?.items ?? []).flatMap((template) =>
        template.skins.map((skin) => ({ key: `${template.id}:${skin.key}`, template, skin })),
      ),
    [templatesQuery.data],
  );

  if (templatesQuery.isPending) return <Skeleton active paragraph={{ rows: 6 }} />;
  if (templatesQuery.isError) return <QueryError onRetry={() => templatesQuery.refetch()} />;

  const occasions = [...new Set(items.flatMap((item) => item.skin.tags))];
  const kinds = [...new Set(items.map((item) => item.template.kind))];
  const occasionLabel = (tag: string) => (isOccasion(tag) ? t(`occasions.${tag}`) : tag);
  const visible = items.filter(
    (item) =>
      (occasion === 'all' || item.skin.tags.includes(occasion)) &&
      (kind === 'all' || item.template.kind === kind),
  );
  const selected = visible.find((item) => item.key === selectedKey) ?? visible[0];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Flex vertical gap={16} className="min-w-0">
        <Flex gap={12} wrap align="center">
          <Segmented
            aria-label={t('filterOccasion')}
            value={occasion}
            onChange={setOccasion}
            options={[
              { value: 'all', label: t('all') },
              ...occasions.map((tag) => ({ value: tag, label: occasionLabel(tag) })),
            ]}
          />
          {kinds.length > 1 && (
            <Segmented<GameKind | 'all'>
              aria-label={t('filterKind')}
              value={kind}
              onChange={setKind}
              options={[
                { value: 'all', label: t('all') },
                ...kinds.map((value) => ({ value, label: t(`kinds.${value}`) })),
              ]}
            />
          )}
        </Flex>

        {visible.length === 0 ? (
          <Card variant="borderless" style={{ border: `1px solid ${token.colorBorderSecondary}` }}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('empty')} />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="template-grid">
            {visible.map((item) => {
              const isSelected = item.key === selected?.key;
              const name = localize(item.template.name, locale);
              return (
                <Card
                  key={item.key}
                  hoverable
                  variant="borderless"
                  data-testid={`template-item-${item.key}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedKey(item.key)}
                  style={{
                    border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                    boxShadow: isSelected ? `0 0 0 1px ${token.colorPrimary}` : undefined,
                  }}
                  styles={{ body: { padding: 12 } }}
                >
                  <Flex
                    justify="center"
                    style={{ background: token.colorFillQuaternary, borderRadius: 10, padding: 12 }}
                  >
                    <TemplatePreview
                      templateId={item.template.id}
                      skinKey={item.skin.key}
                      config={item.template.defaultConfig}
                      brand={brand}
                      locale={locale}
                      height={240}
                      title={name}
                    />
                  </Flex>
                  <div className="mt-3">
                    <Typography.Text strong>{name}</Typography.Text>
                    <Flex justify="space-between" align="center" gap={8} className="mt-1">
                      <Caption>{localize(item.skin.name, locale)}</Caption>
                      <Tag variant="filled" className="!m-0">
                        {t(`kinds.${item.template.kind}`)}
                      </Tag>
                    </Flex>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Flex>

      {selected && (
        <Card
          variant="borderless"
          style={{ border: `1px solid ${token.colorBorderSecondary}` }}
          data-testid="template-detail"
        >
          <Flex vertical gap={14}>
            <div>
              <Typography.Title level={5} className="!m-0">
                {localize(selected.template.name, locale)}
              </Typography.Title>
              <Caption>{localize(selected.template.description, locale)}</Caption>
            </div>
            <Flex justify="center">
              <TemplatePreview
                templateId={selected.template.id}
                skinKey={selected.skin.key}
                config={selected.template.defaultConfig}
                brand={brand}
                locale={locale}
                height={460}
                title={t('previewTitle')}
                interactive
              />
            </Flex>
            <Caption>{t('previewHint')}</Caption>
            {selected.template.skins.length > 1 && (
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('skins')}
                </Typography.Text>
                <Segmented
                  block
                  className="mt-1"
                  value={selected.skin.key}
                  onChange={(skinKey) => setSelectedKey(`${selected.template.id}:${skinKey}`)}
                  options={selected.template.skins.map((skin) => ({
                    value: skin.key,
                    label: localize(skin.name, locale),
                  }))}
                />
              </div>
            )}
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('slots')}
              </Typography.Text>
              <div className="mt-1">
                {selected.template.assetSlots.length ? (
                  <Flex gap={6} wrap>
                    {selected.template.assetSlots.map((slot) => (
                      <Tag key={slot.key} variant="filled" className="!m-0">
                        {localize(slot.label, locale)}
                      </Tag>
                    ))}
                  </Flex>
                ) : (
                  <Caption>{t('noSlots')}</Caption>
                )}
              </div>
            </div>
            <Button
              type="primary"
              size="large"
              block
              icon={<Sparkles className="size-4" />}
              data-testid="use-template-button"
              onClick={() => setCreating(true)}
            >
              {t('useTemplate')}
            </Button>
          </Flex>
          <QuickCreateDialog
            key={selected.key}
            orgId={orgId}
            template={selected.template}
            skin={selected.skin}
            brandKits={brandKits}
            open={creating}
            onClose={() => setCreating(false)}
          />
        </Card>
      )}
    </div>
  );
}
