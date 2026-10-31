'use client';

import { cx } from '@playora/ui/utils/cx';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import {
  DropdownItem as BoardDropdownItem,
  DropdownTrigger as BoardDropdownTrigger,
  Dropdown,
  DropdownDivider,
  DropdownPopover,
} from './base/dropdown/dropdown';

export function DropdownMenu({ children }: { children: ReactNode }) {
  return <Dropdown>{children}</Dropdown>;
}

export function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: ReactNode;
  asChild?: boolean;
}) {
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string; children?: ReactNode }>;
    return (
      <BoardDropdownTrigger className={child.props.className}>
        {child.props.children}
      </BoardDropdownTrigger>
    );
  }
  return <BoardDropdownTrigger>{children}</BoardDropdownTrigger>;
}

export function DropdownMenuContent({
  children,
  className,
  'aria-label': ariaLabel = 'Menu',
}: {
  children: ReactNode;
  className?: string;
  align?: string;
  'aria-label'?: string;
}) {
  return (
    <DropdownPopover aria-label={ariaLabel} className={className}>
      {children}
    </DropdownPopover>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  asChild,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  asChild?: boolean;
}) {
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cx(
        'group flex w-full items-center gap-2 rounded-2lg p-2 text-body-medium text-text-primary transition-colors hover:bg-background-primary-hover active:bg-background-primary-active outline-none cursor-pointer',
        className,
        child.props.className,
      ),
    });
  }

  return (
    <BoardDropdownItem onSelect={onClick} className={className}>
      {children}
    </BoardDropdownItem>
  );
}

export function DropdownMenuSeparator() {
  return <DropdownDivider />;
}
