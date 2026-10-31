import type { HTMLAttributes } from 'react';
import { cx } from '../utils/cx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-border-card-default bg-background-secondary-default',
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />;
}
