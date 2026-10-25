'use client';

import { Card, theme } from 'antd';

/**
 * Bordered card that holds a list page's table flush to its edges, with an optional toolbar
 * (search, filters, bulk actions) above it. After games-vt's TableCard (docs/13 §5).
 */
export function TableCard({
  toolbar,
  header,
  children,
}: {
  toolbar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { token } = theme.useToken();

  return (
    <Card
      variant="borderless"
      className="overflow-hidden"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      styles={{ body: { padding: 0 } }}
    >
      {header}
      {toolbar && <div className="p-4">{toolbar}</div>}
      {children}
    </Card>
  );
}
