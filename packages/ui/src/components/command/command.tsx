'use client';

import {
  Modal,
  type ModalBackdropProps,
  type ModalContainerProps,
  type ModalDialogProps,
  Separator,
  type SeparatorProps,
} from '@heroui/react';
import { tv } from '@heroui/styles';
import {
  type ComponentProps,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useMemo,
} from 'react';
import {
  Autocomplete,
  type AutocompleteProps,
  Button as RACButton,
  type ButtonProps as RACButtonProps,
  Header as RACHeader,
  Input as RACInput,
  type InputProps as RACInputProps,
  ListBox as RACListBox,
  ListBoxItem as RACListBoxItem,
  type ListBoxItemProps as RACListBoxItemProps,
  type ListBoxProps as RACListBoxProps,
  ListBoxSection as RACListBoxSection,
  type ListBoxSectionProps as RACListBoxSectionProps,
  SearchField as RACSearchField,
  type SearchFieldProps as RACSearchFieldProps,
  useFilter,
} from 'react-aria-components';
import { composeSlotClassName, composeTwRenderProps } from '../pro-layout/shared';

export type CommandSize = 'sm' | 'md' | 'lg';
export type CommandBackdropVariant = 'blur' | 'opaque' | 'transparent';

export const commandVariants = tv({
  defaultVariants: {
    size: 'md',
    variant: 'opaque',
  },
  slots: {
    backdrop: 'command__backdrop',
    container: 'command__container',
    dialog: 'command__dialog',
    empty: 'command__empty',
    footer: 'command__footer',
    group: 'command__group',
    groupHeading: 'command__group-heading',
    header: 'command__header',
    inputGroup: 'command__input-group',
    inputGroupClearButton: 'command__input-group-clear-button',
    inputGroupInput: 'command__input-group-input',
    inputGroupPrefix: 'command__input-group-prefix',
    inputGroupSuffix: 'command__input-group-suffix',
    item: 'command__item',
    list: 'command__list',
    separator: 'command__separator',
  },
  variants: {
    size: {
      sm: { dialog: 'command__dialog--sm' },
      md: { dialog: 'command__dialog--md' },
      lg: { dialog: 'command__dialog--lg' },
    },
    variant: {
      blur: { backdrop: 'command__backdrop--blur' },
      opaque: { backdrop: 'command__backdrop--opaque' },
      transparent: { backdrop: 'command__backdrop--transparent' },
    },
  },
});

type CommandSlots = ReturnType<typeof commandVariants>;

interface CommandContextValue {
  slots?: CommandSlots;
}

const CommandContext = createContext<CommandContextValue>({});

export const useCommand = () => useContext(CommandContext);

export interface CommandProps {
  children?: ReactNode;
  size?: CommandSize;
  variant?: CommandBackdropVariant;
}

function CommandRoot({ children, size, variant }: CommandProps) {
  const slots = useMemo(() => commandVariants({ size, variant }), [size, variant]);
  return <CommandContext.Provider value={{ slots }}>{children}</CommandContext.Provider>;
}

export interface CommandBackdropProps extends ModalBackdropProps {
  variant?: CommandBackdropVariant;
}

function CommandBackdrop({
  children,
  className,
  isDismissable = true,
  variant,
  ...rest
}: CommandBackdropProps) {
  const ctx = useCommand();
  const slots = useMemo(
    () => (variant ? commandVariants({ variant }) : (ctx.slots ?? commandVariants())),
    [variant, ctx.slots],
  );

  return (
    <Modal.Backdrop
      className={composeTwRenderProps(className, slots?.backdrop())}
      data-slot="command-backdrop"
      isDismissable={isDismissable}
      {...rest}
    >
      {children}
    </Modal.Backdrop>
  );
}

export interface CommandContainerProps extends ModalContainerProps {
  size?: CommandSize;
}

function CommandContainer({ children, className, size, ...rest }: CommandContainerProps) {
  const ctx = useCommand();
  const mergedSlots = useMemo(() => {
    if (size) {
      const sizeSlots = commandVariants({ size });
      return { ...ctx.slots, ...sizeSlots } as CommandSlots;
    }
    return ctx.slots ?? commandVariants();
  }, [size, ctx.slots]);

  return (
    <Modal.Container
      className={composeTwRenderProps(className, mergedSlots?.container())}
      data-slot="command-container"
      {...rest}
    >
      {(renderProps) => (
        <CommandContext.Provider value={{ slots: mergedSlots }}>
          {typeof children === 'function' ? children(renderProps) : children}
        </CommandContext.Provider>
      )}
    </Modal.Container>
  );
}

export interface CommandDialogProps
  extends Omit<ModalDialogProps, 'children'>,
    Pick<AutocompleteProps, 'inputValue' | 'defaultInputValue' | 'onInputChange' | 'filter'> {
  children?: ReactNode;
}

function CommandDialog({
  children,
  className,
  defaultInputValue,
  filter,
  inputValue,
  onInputChange,
  ...rest
}: CommandDialogProps) {
  const { slots } = useCommand();
  const { contains } = useFilter({ sensitivity: 'base' });
  const resolvedFilter = filter ?? contains;

  return (
    <Modal.Dialog
      aria-label="Command palette"
      className={composeSlotClassName(slots?.dialog, className)}
      data-slot="command-dialog"
      {...rest}
    >
      <Autocomplete
        defaultInputValue={defaultInputValue}
        filter={resolvedFilter}
        inputValue={inputValue}
        onInputChange={onInputChange}
      >
        {children}
      </Autocomplete>
    </Modal.Dialog>
  );
}

export type CommandHeaderProps = ComponentProps<'div'>;

function CommandHeader({ children, className, ...rest }: CommandHeaderProps) {
  const { slots } = useCommand();
  return (
    <div
      className={composeSlotClassName(slots?.header, className)}
      data-slot="command-header"
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CommandInputGroupProps extends RACSearchFieldProps {}

function CommandInputGroupRoot({
  'aria-label': ariaLabel = 'Search commands',
  autoFocus = true,
  children,
  className,
  ...rest
}: CommandInputGroupProps) {
  const { slots } = useCommand();
  return (
    <RACSearchField
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      className={composeTwRenderProps(className, slots?.inputGroup())}
      data-slot="command-input-group"
      {...rest}
    >
      {children}
    </RACSearchField>
  );
}

export type CommandInputGroupPrefixProps = ComponentProps<'div'>;

function CommandInputGroupPrefix({ children, className, ...rest }: CommandInputGroupPrefixProps) {
  const { slots } = useCommand();
  return (
    <div
      className={composeSlotClassName(slots?.inputGroupPrefix, className)}
      data-slot="command-input-group-prefix"
      {...rest}
    >
      {children}
    </div>
  );
}

export type CommandInputGroupSuffixProps = ComponentProps<'div'>;

function CommandInputGroupSuffix({ children, className, ...rest }: CommandInputGroupSuffixProps) {
  const { slots } = useCommand();
  return (
    <div
      className={composeSlotClassName(slots?.inputGroupSuffix, className)}
      data-slot="command-input-group-suffix"
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CommandInputGroupInputProps extends RACInputProps {}

function CommandInputGroupInput({
  className,
  onKeyDownCapture,
  placeholder = 'Search commands...',
  ...rest
}: CommandInputGroupInputProps) {
  const handleKeyDownCapture = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDownCapture?.(e);
    if (!e.defaultPrevented && (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey)) {
      e.stopPropagation();
    }
  };

  return (
    <RACInput
      className={className}
      data-slot="command-input-group-input"
      onKeyDownCapture={handleKeyDownCapture}
      placeholder={placeholder}
      {...rest}
    />
  );
}

export interface CommandInputGroupClearButtonProps extends RACButtonProps {}

function CommandInputGroupClearButton({ className, ...rest }: CommandInputGroupClearButtonProps) {
  const { slots } = useCommand();
  return (
    <RACButton
      className={composeTwRenderProps(className, slots?.inputGroupClearButton())}
      data-slot="command-input-group-clear-button"
      slot="clear"
      {...rest}
    />
  );
}

const CommandInputGroup = Object.assign(CommandInputGroupRoot, {
  ClearButton: CommandInputGroupClearButton,
  Input: CommandInputGroupInput,
  Prefix: CommandInputGroupPrefix,
  Suffix: CommandInputGroupSuffix,
});

export interface CommandListProps<T extends object = object> extends RACListBoxProps<T> {
  renderEmptyState?: () => ReactNode;
}

function CommandList<T extends object = object>({
  children,
  className,
  renderEmptyState,
  ...rest
}: CommandListProps<T>) {
  const { slots } = useCommand();
  const emptyRenderer = renderEmptyState
    ? () => (
        <div className={slots?.empty()} data-slot="command-empty">
          {renderEmptyState()}
        </div>
      )
    : undefined;

  return (
    <RACListBox
      className={composeTwRenderProps(className, slots?.list())}
      data-slot="command-list"
      renderEmptyState={emptyRenderer}
      {...rest}
    >
      {children}
    </RACListBox>
  );
}

export interface CommandItemProps<T extends object = object> extends RACListBoxItemProps<T> {}

function CommandItem<T extends object = object>({
  children,
  className,
  ...rest
}: CommandItemProps<T>) {
  const { slots } = useCommand();
  return (
    <RACListBoxItem
      className={composeTwRenderProps(className, slots?.item())}
      data-slot="command-item"
      {...rest}
    >
      {children}
    </RACListBoxItem>
  );
}

export interface CommandGroupProps<T extends object = object> extends RACListBoxSectionProps<T> {
  heading?: ReactNode;
}

function CommandGroup<T extends object = object>({
  children,
  className,
  heading,
  ...rest
}: CommandGroupProps<T>) {
  const { slots } = useCommand();
  return (
    <RACListBoxSection
      className={composeSlotClassName(slots?.group, className)}
      data-slot="command-group"
      {...rest}
    >
      {heading ? (
        <RACHeader className={slots?.groupHeading()} data-slot="command-group-heading">
          {heading}
        </RACHeader>
      ) : null}
      {children as ReactNode}
    </RACListBoxSection>
  );
}

export type CommandSeparatorProps = SeparatorProps;

function CommandSeparator({ className, ...rest }: CommandSeparatorProps) {
  const { slots } = useCommand();
  return (
    <Separator
      className={composeSlotClassName(slots?.separator, className)}
      data-slot="command-separator"
      {...rest}
    />
  );
}

export type CommandFooterProps = ComponentProps<'div'>;

function CommandFooter({ children, className, ...rest }: CommandFooterProps) {
  const { slots } = useCommand();
  return (
    <div
      className={composeSlotClassName(slots?.footer, className)}
      data-slot="command-footer"
      {...rest}
    >
      {children}
    </div>
  );
}

export type CommandEmptyProps = ComponentProps<'div'>;

function CommandEmpty({ children, className, ...rest }: CommandEmptyProps) {
  const { slots } = useCommand();
  return (
    <div
      className={composeSlotClassName(slots?.empty, className)}
      data-slot="command-empty"
      {...rest}
    >
      {children}
    </div>
  );
}

export const Command = Object.assign(CommandRoot, {
  Backdrop: CommandBackdrop,
  Container: CommandContainer,
  Dialog: CommandDialog,
  Empty: CommandEmpty,
  Footer: CommandFooter,
  Group: CommandGroup,
  Header: CommandHeader,
  InputGroup: CommandInputGroup,
  Item: CommandItem,
  List: CommandList,
  Root: CommandRoot,
  Separator: CommandSeparator,
});
