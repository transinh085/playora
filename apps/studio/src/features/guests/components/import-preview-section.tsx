'use client';

import type { GuestColumnMapping, PreviewGuestsResponse } from '@playora/contracts';
import { Card, Form, Select, Table, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';

export interface ImportPreviewSectionProps {
  preview: PreviewGuestsResponse;
  currentMapping?: GuestColumnMapping;
  noTeamValue: string;
}

export function ImportPreviewSection({
  preview,
  currentMapping,
  noTeamValue,
}: ImportPreviewSectionProps) {
  const t = useTranslations();

  const extraColumns = (preview.headers ?? []).filter(
    (h) =>
      h &&
      h !== currentMapping?.externalCode &&
      h !== currentMapping?.displayName &&
      h !== currentMapping?.team,
  );

  return (
    <Card size="small">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Form.Item
            name={['mapping', 'externalCode']}
            label={t('guests.mapExternalCode')}
            rules={[{ required: true }]}
            className="!mb-0"
          >
            <Select
              options={preview.headers.map((h) => ({ label: h, value: h }))}
              placeholder={t('guests.mapExternalCode')}
            />
          </Form.Item>

          <Form.Item
            name={['mapping', 'displayName']}
            label={t('guests.mapDisplayName')}
            rules={[{ required: true }]}
            className="!mb-0"
          >
            <Select
              options={preview.headers.map((h) => ({ label: h, value: h }))}
              placeholder={t('guests.mapDisplayName')}
            />
          </Form.Item>

          <Form.Item name={['mapping', 'team']} label={t('guests.mapTeam')} className="!mb-0">
            <Select
              options={[
                { label: t('guests.noTeamColumn'), value: noTeamValue },
                ...preview.headers.map((h) => ({ label: h, value: h })),
              ]}
              placeholder={t('guests.mapTeam')}
            />
          </Form.Item>
        </div>

        {extraColumns.length > 0 && (
          <Caption>{t('guests.extraColumnsHint', { columns: extraColumns.join(', ') })}</Caption>
        )}

        <div className="flex flex-col gap-2">
          <Typography.Text strong>
            {t('guests.previewTitle', { count: preview.totalRows })}
          </Typography.Text>
          <Table
            dataSource={preview.sampleRows.map((row, idx) => ({
              key: `row-${idx}`,
              ...row,
            }))}
            columns={preview.headers.map((h) => ({
              title: h,
              dataIndex: h,
              key: h,
              render: (val: unknown) => (val !== undefined ? String(val) : ''),
            }))}
            size="small"
            pagination={false}
            scroll={{ x: 'max-content', y: 180 }}
          />
        </div>
      </div>
    </Card>
  );
}
