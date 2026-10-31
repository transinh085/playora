import type { ComponentProps } from 'react';
import { ProgressBar } from './base/progress/progress';

export function Progress({ value, className, ...props }: ComponentProps<typeof ProgressBar>) {
  return <ProgressBar value={value} className={className} {...props} />;
}
