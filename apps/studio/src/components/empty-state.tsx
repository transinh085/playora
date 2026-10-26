'use client';

import { Button, Card, Flex, Typography, theme } from 'antd';
import type { LucideIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: Route | string;
  onAction?: () => void;
  extra?: ReactNode;
  bordered?: boolean;
}

/**
 * Consistent, delightful empty state following the Playora / games-vt admin aesthetic.
 * Clean neutral surface, muted icon tile, clear typography, and a prominent call-to-action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  extra,
  bordered = true,
}: EmptyStateProps) {
  const { token } = theme.useToken();

  const actionButton =
    actionText &&
    (actionHref ? (
      <Link href={actionHref as Route}>
        <Button type="primary" size="middle">
          {actionText}
        </Button>
      </Link>
    ) : onAction ? (
      <Button type="primary" size="middle" onClick={onAction}>
        {actionText}
      </Button>
    ) : null);

  return (
    <Card
      variant="borderless"
      style={bordered ? { border: `1px solid ${token.colorBorderSecondary}` } : undefined}
      styles={{ body: { padding: '48px 24px' } }}
    >
      <Flex
        vertical
        align="center"
        justify="center"
        gap={16}
        className="text-center max-w-md mx-auto"
      >
        <div
          className="flex items-center justify-center rounded-2xl transition-transform duration-200"
          style={{
            width: 56,
            height: 56,
            backgroundColor: token.colorFillSecondary,
            color: token.colorPrimary,
          }}
        >
          <Icon className="size-7 stroke-[1.75]" />
        </div>
        <div className="space-y-1">
          <Typography.Title level={5} className="!m-0" style={{ fontWeight: 600 }}>
            {title}
          </Typography.Title>
          <Typography.Paragraph
            type="secondary"
            className="!m-0"
            style={{ fontSize: 13, lineHeight: 1.5 }}
          >
            {description}
          </Typography.Paragraph>
        </div>
        {(actionButton || extra) && (
          <Flex gap={8} align="center" className="mt-2">
            {actionButton}
            {extra}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
