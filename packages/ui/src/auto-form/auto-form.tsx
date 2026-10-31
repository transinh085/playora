'use client';

import { Alert, AlertTitle } from '@playora/ui/components/alert';
import { Badge } from '@playora/ui/components/badge';
import { Card } from '@playora/ui/components/card';
import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';
import type { AssetSlot, AutoFormProps, FieldDescriptor, Locale } from './types';
import {
  findFieldByPath,
  getValueAtPath,
  groupLabelFor,
  isFieldHotEditable,
  resolveFieldError,
  resolveLocalized,
  SUPPORTED_WIDGETS,
  setValueAtPath,
  withFieldDefaults,
} from './utils';
import {
  CustomWidgetControl,
  FieldHint,
  ListWidgetControl,
  LocalizedWidgetControl,
  renderScalarControl,
} from './widgets';

interface FieldRendererProps {
  field: FieldDescriptor;
  path: string;
  locale: Locale;
  hotEditablePaths: readonly string[];
  published?: boolean;
  brandPalette?: readonly string[];
  assetSlotMap: ReadonlyMap<string, AssetSlot>;
  renderAssetPicker?: AutoFormProps['renderAssetPicker'];
  onPickAsset?: AutoFormProps['onPickAsset'];
  widgets?: AutoFormProps['widgets'];
  errors?: AutoFormProps['errors'];
  disabled?: boolean;
  effectiveValue: Record<string, unknown>;
  onFieldChange: (fieldPath: string, nextVal: unknown) => void;
}

function renderFieldLabel(field: FieldDescriptor, label: string, locale: Locale) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      {field.hotEditable && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
          {locale === 'en' ? 'Hot-editable' : 'Sửa nhanh'}
        </Badge>
      )}
    </span>
  );
}

function AutoFormField(props: FieldRendererProps) {
  const {
    field,
    path,
    locale,
    hotEditablePaths,
    published,
    disabled,
    effectiveValue,
    onFieldChange,
  } = props;
  const label = resolveLocalized(field.label, locale, field.key);
  const description = resolveLocalized(field.description, locale);
  const placeholder = resolveLocalized(field.placeholder, locale);
  const errorMsg = resolveFieldError(props.errors, path);
  const isFieldDisabled =
    Boolean(disabled) || (Boolean(published) && !isFieldHotEditable(field, path, hotEditablePaths));
  const CustomWidget = props.widgets?.[field.widget];
  const value = getValueAtPath(effectiveValue, path) ?? field.defaultValue;

  if (!CustomWidget && (field.widget === 'object' || (field.type === 'object' && field.fields))) {
    return (
      <Card
        role="group"
        aria-label={label}
        data-slot="autoform-object"
        data-widget="object"
        data-field-path={path}
        className="p-4"
      >
        <div className="font-semibold text-sm mb-3">{renderFieldLabel(field, label, locale)}</div>
        <div className="grid gap-3">
          {description && <FieldHint>{description}</FieldHint>}
          {(field.fields ?? []).map((child) => (
            <AutoFormField
              key={`${path}.${child.key}`}
              {...props}
              field={child}
              path={path ? `${path}.${child.key}` : child.key}
            />
          ))}
          {errorMsg && (
            <FieldHint type="danger" role="alert" data-slot="field-error">
              {errorMsg}
            </FieldHint>
          )}
        </div>
      </Card>
    );
  }

  let control: React.ReactNode = null;

  if (CustomWidget) {
    control = (
      <CustomWidgetControl
        Component={CustomWidget}
        field={field}
        path={path}
        value={value}
        onChange={(nextVal) => onFieldChange(path, nextVal)}
        locale={locale}
        disabled={isFieldDisabled}
        brandPalette={props.brandPalette}
        error={errorMsg}
      />
    );
  } else if (!SUPPORTED_WIDGETS.has(field.widget)) {
    const msg =
      locale === 'en'
        ? `Unsupported widget: ${String(field.widget)}`
        : `Widget chưa hỗ trợ: ${String(field.widget)}`;
    control = (
      <Alert
        variant="default"
        data-widget-fallback={String(field.widget)}
        data-widget-unsupported={String(field.widget)}
      >
        <AlertTitle>{msg}</AlertTitle>
      </Alert>
    );
  } else if (field.widget === 'localized') {
    control = (
      <LocalizedWidgetControl
        field={field}
        label={label}
        value={value as { vi?: string; en?: string }}
        onChange={(nextVal) => onFieldChange(path, nextVal)}
        disabled={isFieldDisabled}
      />
    );
  } else if (field.widget === 'list') {
    control = (
      <ListWidgetControl
        field={field}
        value={value as unknown[]}
        onChange={(nextVal) => onFieldChange(path, nextVal)}
        locale={locale}
        disabled={isFieldDisabled}
        renderItemFields={(_itemVal, idx, onItemChange) => {
          const itemPath = `${path}.${idx}`;
          if (!field.item) return null;
          if (field.item.type === 'object' && field.item.fields) {
            return (
              <div className="grid gap-3">
                {field.item.fields.map((subField) => (
                  <AutoFormField
                    key={`${itemPath}.${subField.key}`}
                    {...props}
                    field={subField}
                    path={`${itemPath}.${subField.key}`}
                    disabled={isFieldDisabled}
                  />
                ))}
              </div>
            );
          }
          return (
            <AutoFormField
              key={itemPath}
              {...props}
              field={field.item}
              path={itemPath}
              disabled={isFieldDisabled}
              onFieldChange={(_p, nextVal) => onItemChange(nextVal)}
            />
          );
        }}
      />
    );
  } else {
    control = renderScalarControl({
      field,
      label,
      placeholder,
      locale,
      value,
      onChange: (nextVal) => onFieldChange(path, nextVal),
      disabled: isFieldDisabled,
      brandPalette: props.brandPalette,
      slot: field.slotKey ? props.assetSlotMap.get(field.slotKey) : undefined,
      renderAssetPicker: props.renderAssetPicker,
      onPickAsset: props.onPickAsset,
    });
  }

  const id = path;

  return (
    <div
      data-slot="autoform-field"
      data-widget={field.widget}
      data-field-path={path}
      data-disabled={isFieldDisabled ? 'true' : undefined}
      className="grid gap-1.5"
    >
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {renderFieldLabel(field, label, locale)}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
      </div>
      {control}
      {errorMsg ? (
        <span role="alert" data-slot="field-error" className="text-xs text-destructive">
          {errorMsg}
        </span>
      ) : description ? (
        <span className="text-xs text-muted-foreground">{description}</span>
      ) : null}
    </div>
  );
}

export function AutoForm(props: AutoFormProps) {
  const { descriptor, value, onChange, locale = 'vi', activeGroup, disabled, className } = props;
  const isGamePublished = Boolean(props.published || props.isPublished);
  const effectiveValue = React.useMemo(
    () => withFieldDefaults(descriptor.fields, value),
    [descriptor.fields, value],
  );

  const assetSlotMap = React.useMemo(
    () => new Map((props.assetSlots ?? []).map((slot) => [slot.key, slot])),
    [props.assetSlots],
  );

  const visibleFields = React.useMemo(
    () =>
      !activeGroup || activeGroup === 'all'
        ? descriptor.fields
        : descriptor.fields.filter((f) => f.group === activeGroup),
    [descriptor.fields, activeGroup],
  );

  const groupedSections = React.useMemo(() => {
    const map = new Map<string, FieldDescriptor[]>(descriptor.groups.map((g) => [g, []]));
    for (const f of visibleFields) {
      const grp = f.group ?? 'general';
      map.set(grp, [...(map.get(grp) ?? []), f]);
    }
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [descriptor.groups, visibleFields]);

  const handleFieldChange = React.useCallback(
    (fieldPath: string, nextVal: unknown) => {
      let nextRoot = setValueAtPath(effectiveValue, fieldPath, nextVal);
      const changedField = findFieldByPath(descriptor.fields, fieldPath);
      const presetPatch =
        changedField?.presets && typeof nextVal === 'string'
          ? changedField.presets[nextVal]
          : undefined;
      if (presetPatch) {
        for (const [presetKey, presetVal] of Object.entries(presetPatch)) {
          nextRoot = setValueAtPath(nextRoot, presetKey, presetVal);
        }
      }
      onChange(nextRoot, fieldPath);
    },
    [descriptor.fields, effectiveValue, onChange],
  );

  const renderFields = (fields: readonly FieldDescriptor[]) => (
    <div className="grid gap-3">
      {fields.map((field) => (
        <AutoFormField
          key={field.path}
          field={field}
          path={field.path}
          locale={locale}
          hotEditablePaths={descriptor.hotEditablePaths}
          published={isGamePublished}
          brandPalette={props.brandPalette}
          assetSlotMap={assetSlotMap}
          renderAssetPicker={props.renderAssetPicker}
          onPickAsset={props.onPickAsset}
          widgets={props.widgets}
          errors={props.errors}
          disabled={disabled}
          effectiveValue={effectiveValue}
          onFieldChange={handleFieldChange}
        />
      ))}
    </div>
  );

  return (
    <div data-slot="auto-form" className={cn('grid gap-4', className)}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {groupedSections.length > 0 ? (
          <div data-slot="autoform-groups" className="space-y-4">
            {groupedSections.map(([grp, list]) => (
              <details
                key={grp}
                open
                data-slot="autoform-group"
                data-group={grp}
                className="group rounded-2xl border border-border/70 bg-card p-4 transition-all"
              >
                <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-foreground select-none list-none [&::-webkit-details-marker]:hidden">
                  <span>{groupLabelFor(grp, locale)}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <div className="mt-4 pt-3 border-t border-border/40">{renderFields(list)}</div>
              </details>
            ))}
          </div>
        ) : (
          renderFields(visibleFields)
        )}
      </form>
    </div>
  );
}
