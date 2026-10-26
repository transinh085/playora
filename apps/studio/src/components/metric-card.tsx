'use client';

import { Card, Col, Flex, Row, Tooltip, Typography, theme } from 'antd';
import { CircleHelp } from 'lucide-react';
import { IconTile, type Tone } from './icon-tile';

export interface MetricCardItem {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon: React.ReactNode;
  tone?: Tone;
  tooltip?: React.ReactNode;
  highlighted?: boolean;
  testId?: string;
}

/** One headline number with its label and a tinted icon tile. After games-vt's MetricCard. */
export function MetricCard({
  label,
  value,
  subtext,
  icon,
  tone = 'primary',
  tooltip,
  highlighted,
  testId,
  loading,
}: MetricCardItem & { loading?: boolean }) {
  const { token } = theme.useToken();

  return (
    <Card
      variant="borderless"
      loading={loading}
      data-testid={testId}
      data-highlighted={highlighted ? 'true' : undefined}
      style={{
        border: highlighted
          ? `1.5px solid ${token.colorPrimary}`
          : `1px solid ${token.colorBorderSecondary}`,
      }}
      styles={{ body: { padding: '16px 20px' } }}
    >
      <Flex align="center" justify="space-between" gap={8}>
        <div className="min-w-0 flex-1">
          <Flex align="center" gap={4}>
            <Typography.Text type="secondary" ellipsis style={{ fontSize: 13, fontWeight: 500 }}>
              {label}
            </Typography.Text>
            {tooltip && (
              <Tooltip title={tooltip}>
                <Typography.Text type="secondary">
                  <CircleHelp className="size-3" />
                </Typography.Text>
              </Tooltip>
            )}
          </Flex>
          <Typography.Text
            ellipsis
            className="mt-1.5 mb-0.5 block"
            style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}
          >
            {value}
          </Typography.Text>
          {subtext && (
            <Typography.Text type="secondary" ellipsis className="block" style={{ fontSize: 12 }}>
              {subtext}
            </Typography.Text>
          )}
        </div>
        <IconTile tone={tone}>{icon}</IconTile>
      </Flex>
    </Card>
  );
}

/** Responsive row of MetricCards: 1 column on phones, 2 on tablets, 4 on desktop. */
export function MetricGrid({ items, loading }: { items: MetricCardItem[]; loading?: boolean }) {
  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col key={item.label} xs={24} sm={12} xl={6}>
          <MetricCard {...item} loading={loading} />
        </Col>
      ))}
    </Row>
  );
}
