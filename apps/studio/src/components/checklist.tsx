'use client';

import { Button, Card, Flex, Progress, Typography, theme } from 'antd';
import { CircleCheck, CircleDashed } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { Caption } from './caption';

export interface ChecklistItem {
  key: string;
  done: boolean;
  title: string;
  description?: string;
  href: string;
  action: string;
}

/**
 * Ordered "what to do next" list with progress (docs/product/specs/studio-ux.md §4): every open item links to the exact
 * place that finishes it, so pages hand the user to the next step instead of leaving them on a list.
 */
export function Checklist({
  title,
  extra,
  items,
  testId,
}: {
  title: React.ReactNode;
  extra?: React.ReactNode;
  items: readonly ChecklistItem[];
  testId?: string;
}) {
  const { token } = theme.useToken();
  const done = items.filter((item) => item.done).length;
  const nextKey = items.find((item) => !item.done)?.key;

  return (
    <Card
      variant="borderless"
      title={title}
      extra={extra ?? <Caption>{`${done}/${items.length}`}</Caption>}
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      data-testid={testId}
    >
      <Progress
        percent={Math.round((done / items.length) * 100)}
        showInfo={false}
        size="small"
        className="!mb-2"
      />
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((item) => (
          <li
            key={item.key}
            data-testid={testId ? `${testId}-${item.key}` : undefined}
            data-done={item.done}
            className="py-3"
            style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}
          >
            <Flex align="center" gap={12}>
              {item.done ? (
                <CircleCheck className="size-5 shrink-0" style={{ color: token.colorSuccess }} />
              ) : (
                <CircleDashed
                  className="size-5 shrink-0"
                  style={{ color: token.colorTextQuaternary }}
                />
              )}
              <div className="min-w-0 flex-1">
                <Typography.Text
                  strong={!item.done}
                  type={item.done ? 'secondary' : undefined}
                  delete={item.done}
                >
                  {item.title}
                </Typography.Text>
                {item.description && !item.done && (
                  <Caption className="block">{item.description}</Caption>
                )}
              </div>
              {!item.done && (
                <Link href={item.href as Route}>
                  <Button
                    size="small"
                    type={item.key === nextKey ? 'primary' : 'default'}
                    tabIndex={-1}
                  >
                    {item.action}
                  </Button>
                </Link>
              )}
            </Flex>
          </li>
        ))}
      </ul>
    </Card>
  );
}
