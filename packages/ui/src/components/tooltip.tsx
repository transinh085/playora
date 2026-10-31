import type { ReactNode } from 'react';

export function Tooltip({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function TooltipTrigger({
  children,
  asChild: _asChild,
}: {
  children: ReactNode;
  asChild?: boolean;
}) {
  return <>{children}</>;
}

export function TooltipContent(_props: {
  children?: ReactNode;
  className?: string;
  side?: string;
  align?: string;
}) {
  return null;
}
