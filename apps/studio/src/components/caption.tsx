import type React from 'react';

/** body-sm (12/20) secondary text: hints, metadata, timestamps. */
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
  const colorClass = type === 'danger' ? 'text-destructive' : 'text-muted-foreground';
  const italicClass = italic ? 'italic' : '';
  return (
    <span
      className={`text-[13px] leading-5 ${colorClass} ${italicClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
