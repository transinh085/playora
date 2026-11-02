'use client';

import { Button, Card, Chip, Separator } from '@playora/ui/components';
import { ArrowRight, Calendar, Repeat, Sparkles, Wand2 } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { Caption } from '@/components/caption';
import { IconTile, type Tone } from '@/components/icon-tile';
import { PLAYBOOK_KEYS, PLAYBOOKS, type PlaybookKey } from '../../lib/playbooks';
import { buildScreens, skinBrand } from '../../lib/starter';
import { FitScreen } from '../editor/fit-screen';

const ICONS: Record<PlaybookKey, { icon: React.ReactNode; tone: Tone }> = {
  tet_traffic: { icon: <Sparkles className="size-5" />, tone: 'primary' },
  second_visit: { icon: <Repeat className="size-5" />, tone: 'success' },
  slow_days: { icon: <Calendar className="size-5" />, tone: 'warning' },
};

/**
 * Screen 1 of campaign creation (`docs/product/specs/playbooks.md` §2.1):
 * "Bạn muốn gì?" — three outcome cards (goal, mechanism, metric, and visual mini-preview)
 * and a visible escape hatch to the raw template gallery.
 */
export function GoalPicker({
  onPick,
  onCustom,
}: {
  onPick: (key: PlaybookKey) => void;
  onCustom: () => void;
}) {
  const t = useTranslations('builderLab.playbooks');
  const th = useTranslations('builderLab.home');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="m-0 text-title-2-semibold text-text-primary">{t('title')}</h2>
        <Caption className="mt-1 block text-body-2-regular text-text-secondary">
          {t('hint')}
        </Caption>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLAYBOOK_KEYS.map((key) => {
          const spec = PLAYBOOKS[key];
          const { icon, tone } = ICONS[spec.key];
          const coverScreen = buildScreens(spec.templateKey, spec.skinKey).cover;
          const brand = skinBrand(spec.skinKey);
          return (
            <Card
              key={spec.key}
              data-testid={`playbook-card-${spec.key}`}
              className="flex h-full flex-col justify-between gap-5 overflow-hidden p-0 transition-all duration-200 hover:shadow-lg"
            >
              <div>
                {/* Visual mini-preview of the playbook's template × skin */}
                <div
                  data-testid="playbook-mini-preview"
                  className="relative h-44 w-full overflow-hidden border-b border-separator-border"
                  style={{ background: brand.background }}
                >
                  <div className="pointer-events-none h-full w-full">
                    <FitScreen screen={coverScreen} brand={brand} />
                  </div>
                  <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-black/65 px-2.5 py-0.5 text-caption-2-medium text-white backdrop-blur-xs">
                      {th(`templates.${spec.templateKey}`)} · {th(`skins.${spec.skinKey}`)}
                    </span>
                    <Chip variant="soft" color="default" size="sm">
                      {t('daysTag', { days: spec.days })}
                    </Chip>
                  </div>
                </div>

                <div className="space-y-4 p-6 pb-0">
                  <Card.Header className="gap-3 p-0">
                    <div className="flex items-start justify-between gap-3">
                      <IconTile tone={tone} size={44}>
                        {icon}
                      </IconTile>
                    </div>

                    <div>
                      <Card.Title className="m-0 text-title-3-semibold text-text-primary">
                        {t(`items.${spec.key}.title`)}
                      </Card.Title>
                      <Card.Description className="mt-1 m-0 text-body-2-medium text-accent-600 dark:text-accent-400">
                        {t(`items.${spec.key}.goal`)}
                      </Card.Description>
                    </div>
                  </Card.Header>

                  <Card.Content className="p-0">
                    <dl className="m-0 space-y-3 rounded-2xl border border-separator-border bg-background-secondary-default/50 p-4">
                      <div>
                        <dt className="text-caption-2-semibold uppercase tracking-wider text-text-tertiary">
                          {t('mechanismLabel')}
                        </dt>
                        <dd className="mt-0.5 m-0 text-body-2-regular text-text-primary">
                          {t(`items.${spec.key}.mechanism`)}
                        </dd>
                      </div>
                      <Separator />
                      <div>
                        <dt className="text-caption-2-semibold uppercase tracking-wider text-text-tertiary">
                          {t('metricLabel')}
                        </dt>
                        <dd className="mt-0.5 m-0 text-body-2-medium text-text-primary">
                          {t(`items.${spec.key}.metric`)}
                        </dd>
                      </div>
                    </dl>
                  </Card.Content>
                </div>
              </div>

              <Card.Footer className="p-6 pt-0">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  data-testid={`playbook-${spec.key}`}
                  onClick={() => onPick(spec.key)}
                >
                  {t('choose')}
                  <ArrowRight className="size-4" />
                </Button>
              </Card.Footer>
            </Card>
          );
        })}
      </div>

      <Card className="flex flex-row flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3.5">
          <IconTile tone="info" size={40}>
            <Wand2 className="size-4" />
          </IconTile>
          <div>
            <span className="block text-body-medium text-text-primary">{t('customTitle')}</span>
            <Caption className="block">{t('hint')}</Caption>
          </div>
        </div>
        <Button variant="secondary" onClick={onCustom}>
          <Wand2 className="size-4" />
          {t('custom')}
        </Button>
      </Card>
    </div>
  );
}
