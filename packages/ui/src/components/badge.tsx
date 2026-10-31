import type { ComponentProps } from 'react';
import { Badge as BoardBadge } from './base/badges/badge';

export function Badge({
  variant,
  className,
  asChild,
  ...props
}: ComponentProps<typeof BoardBadge> & { variant?: string; asChild?: boolean }) {
  return <BoardBadge color="neutral" className={className} {...props} />;
}
