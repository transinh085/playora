import { cx } from '@playora/ui/utils/cx';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { cloneElement, isValidElement } from 'react';
import { Button as BoardButton } from './base/buttons/button';

type LegacyVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'destructive'
  | 'link';

type LegacySize = 'default' | 'sm' | 'small' | 'md' | 'medium' | 'lg' | 'xs' | 'icon';

export interface ButtonProps extends Omit<ComponentProps<typeof BoardButton>, 'variant' | 'size'> {
  variant?: LegacyVariant;
  size?: LegacySize;
  asChild?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Button({
  variant = 'default',
  size = 'default',
  asChild,
  className,
  children,
  ...props
}: ButtonProps) {
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cx(className, child.props.className),
    });
  }

  const mappedVariant: ComponentProps<typeof BoardButton>['variant'] =
    variant === 'default'
      ? 'primary'
      : variant === 'outline'
        ? 'secondary'
        : variant === 'destructive'
          ? 'danger'
          : variant === 'ghost' || variant === 'secondary' || variant === 'danger'
            ? variant
            : 'primary';

  const mappedSize: ComponentProps<typeof BoardButton>['size'] =
    size === 'icon' || size === 'sm' || size === 'small'
      ? 'small'
      : size === 'xs'
        ? 'xs'
        : 'medium';

  return (
    <BoardButton
      variant={mappedVariant}
      size={mappedSize}
      iconOnly={size === 'icon'}
      className={className}
      {...props}
    >
      {children}
    </BoardButton>
  );
}
