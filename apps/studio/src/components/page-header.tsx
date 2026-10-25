'use client';

import { Button, Flex, Space, Tooltip, Typography } from 'antd';
import { ArrowLeft } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';

/**
 * Page title row for every Studio page (docs/13 §5, after games-vt's PageHeader): bold title with
 * inline tags, a one-line description under it, an outlined back button, and actions on the right.
 */
export function PageHeader({
  title,
  description,
  tags,
  extra,
  backHref,
  backLabel,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  tags?: React.ReactNode;
  extra?: React.ReactNode;
  backHref?: Route;
  backLabel?: string;
}) {
  const router = useRouter();

  return (
    <Flex align="center" justify="space-between" gap={16} wrap>
      <Flex align="center" gap={12} className="min-w-0">
        {backHref && (
          <Tooltip title={backLabel}>
            <Button
              icon={<ArrowLeft className="size-4" />}
              aria-label={backLabel}
              onClick={() => router.push(backHref)}
            />
          </Tooltip>
        )}
        <div className="min-w-0">
          <Flex align="center" gap={8} wrap>
            <Typography.Title level={4} className="!m-0" style={{ fontWeight: 700 }}>
              {title}
            </Typography.Title>
            {tags}
          </Flex>
          {description && (
            <Typography.Text type="secondary" className="mt-0.5 block" style={{ fontSize: 13 }}>
              {description}
            </Typography.Text>
          )}
        </div>
      </Flex>
      {extra && <Space wrap>{extra}</Space>}
    </Flex>
  );
}
