import { cx } from '@playora/ui/utils/cx';
import type React from 'react';

/** BoardUI caption text: hints, metadata, timestamps. */
export interface CaptionProps extends React.HTMLAttributes<HTMLSpanElement> {
  type?: 'secondary' | 'danger';
  italic?: boolean;
}

export function Caption({
  className = '',
  children,
  type = 'secondary',
  italic,
  ...props
}: CaptionProps) {
  const colorClass = type === 'danger' ? 'text-text-error-primary' : 'text-text-secondary';
  return (
    <span
      className={cx('text-caption-1-regular', colorClass, italic && 'italic', className)}
      {...props}
    >
      {children}
    </span>
  );
}
