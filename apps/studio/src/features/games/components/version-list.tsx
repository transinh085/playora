'use client';

import { type GameVersionSummary, localize, type TemplateSkinSummary } from '@playora/contracts';
import { Divider, Empty, Tag } from 'antd';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Fragment } from 'react';
import { Caption } from '@/components/caption';

export function VersionList({
  versions,
  currentVersion,
  skins = [],
}: {
  versions: readonly GameVersionSummary[];
  currentVersion?: number | null;
  skins?: readonly TemplateSkinSummary[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();

  if (versions.length === 0) {
    return (
      <div data-testid="versions-empty-state" className="py-6">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('games.versionsEmpty')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col" data-testid="version-list">
      {versions.map((ver, idx) => {
        const isCurrent = ver.version === currentVersion;
        const skinObj = skins.find((s) => s.key === ver.skinKey);
        return (
          <Fragment key={ver.id}>
            {idx > 0 && <Divider className="!my-3" />}
            <div
              data-testid={`version-row-${ver.version}`}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag color="processing" variant="filled" className="!m-0">
                    v{ver.version}
                  </Tag>
                  {isCurrent && (
                    <Tag color="success" variant="filled" className="!m-0">
                      {t('games.versionCurrent')}
                    </Tag>
                  )}
                  {skinObj && <Caption>{localize(skinObj.name, locale)}</Caption>}
                </div>
                <Caption>{t('games.versionHash', { hash: ver.configHash.slice(0, 8) })}</Caption>
              </div>
              <Caption>
                {format.dateTime(new Date(ver.createdAt), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Caption>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
