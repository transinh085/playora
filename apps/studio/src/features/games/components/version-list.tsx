'use client';

import { type GameVersionSummary, localize, type TemplateSkinSummary } from '@playora/contracts';
import { Empty, Tag, Typography } from 'antd';
import { useFormatter, useLocale, useTranslations } from 'next-intl';

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
    <div className="grid gap-2" data-testid="version-list">
      {versions.map((ver) => {
        const isCurrent = ver.version === currentVersion;
        const skinObj = skins.find((s) => s.key === ver.skinKey);
        return (
          <div
            key={ver.id}
            data-testid={`version-row-${ver.version}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--ant-color-border-secondary)] p-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Tag color="processing" variant="filled" className="!m-0 font-mono">
                  v{ver.version}
                </Tag>
                {isCurrent && (
                  <Tag color="success" variant="filled" className="!m-0">
                    {t('games.versionCurrent')}
                  </Tag>
                )}
                {skinObj && (
                  <Typography.Text type="secondary" className="text-xs">
                    {localize(skinObj.name, locale)}
                  </Typography.Text>
                )}
              </div>
              <Typography.Text type="secondary" className="font-mono text-xs">
                {t('games.versionHash', { hash: ver.configHash.slice(0, 8) })}
              </Typography.Text>
            </div>
            <Typography.Text type="secondary" className="text-xs">
              {format.dateTime(new Date(ver.createdAt), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Typography.Text>
          </div>
        );
      })}
    </div>
  );
}
