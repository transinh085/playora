'use client';

import { localize } from '@playora/contracts';
import { Card, Flex, theme } from 'antd';
import type { Route } from 'next';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
import { useTemplates } from '../api';
import { DEFAULT_BRAND_PAYLOAD } from '../lib/builder-helpers';
import { TemplatePreview } from './template-preview';

const TEASER_COUNT = 2;

/** A few live template thumbnails on Home that open the gallery (docs/16 §3). */
export function TemplateTeaser({ orgId }: { orgId: string }) {
  const t = useTranslations('home');
  const locale = useLocale() as 'vi' | 'en';
  const { token } = theme.useToken();
  const templates = useTemplates();
  const href = `/orgs/${orgId}/templates` as Route;
  const items = (templates.data?.items ?? [])
    .flatMap((template) => template.skins.map((skin) => ({ template, skin })))
    .slice(0, TEASER_COUNT);

  return (
    <Card
      variant="borderless"
      title={t('templates')}
      extra={<Link href={href}>{t('allTemplates')}</Link>}
      loading={templates.isPending}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
    >
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ template, skin }) => (
          <Link key={`${template.id}:${skin.key}`} href={href} className="block">
            <Flex
              justify="center"
              style={{ background: token.colorFillQuaternary, borderRadius: 10, padding: 8 }}
            >
              <TemplatePreview
                templateId={template.id}
                skinKey={skin.key}
                config={template.defaultConfig}
                brand={DEFAULT_BRAND_PAYLOAD}
                locale={locale}
                height={200}
                title={localize(template.name, locale)}
              />
            </Flex>
            <Caption className="mt-1 block text-center">{localize(skin.name, locale)}</Caption>
          </Link>
        ))}
      </div>
    </Card>
  );
}
