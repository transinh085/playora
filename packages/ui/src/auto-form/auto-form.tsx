'use client';

import { toNamePath, zodRule } from '@playora/ui/form';
import { cn } from '@playora/ui/lib/utils';
import { Alert, Card, Collapse, Form, type FormRule, Tag } from 'antd';
import * as React from 'react';
import type { AssetSlot, AutoFormProps, FieldDescriptor, Locale } from './types';
import {
  extractChangedPath,
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
  relNamePath: (string | number)[];
  locale: Locale;
  hotEditablePaths: readonly string[];
  published?: boolean;
  brandPalette?: readonly string[];
  assetSlotMap: ReadonlyMap<string, AssetSlot>;
  renderAssetPicker?: AutoFormProps['renderAssetPicker'];
  onPickAsset?: AutoFormProps['onPickAsset'];
  widgets?: AutoFormProps['widgets'];
  rules: FormRule[];
  errors?: AutoFormProps['errors'];
  disabled?: boolean;
}

function renderFieldLabel(field: FieldDescriptor, label: string, locale: Locale) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      {field.hotEditable && (
        <Tag className="m-0">{locale === 'en' ? 'Hot-editable' : 'Sửa nhanh'}</Tag>
      )}
    </span>
  );
}

function AutoFormField(props: FieldRendererProps) {
  const { field, path, relNamePath, locale, hotEditablePaths, published, disabled } = props;
  const label = resolveLocalized(field.label, locale, field.key);
  const description = resolveLocalized(field.description, locale);
  const placeholder = resolveLocalized(field.placeholder, locale);
  const errorMsg = resolveFieldError(props.errors, path);
  const isFieldDisabled =
    Boolean(disabled) || (Boolean(published) && !isFieldHotEditable(field, path, hotEditablePaths));
  const CustomWidget = props.widgets?.[field.widget];

  if (!CustomWidget && (field.widget === 'object' || (field.type === 'object' && field.fields))) {
    return (
      <Card
        size="small"
        role="group"
        aria-label={label}
        data-slot="autoform-object"
        data-widget="object"
        data-field-path={path}
        title={renderFieldLabel(field, label, locale)}
      >
        <div className="grid gap-3">
          {description && <FieldHint>{description}</FieldHint>}
          {(field.fields ?? []).map((child) => (
            <AutoFormField
              key={`${path}.${child.key}`}
              {...props}
              field={child}
              path={path ? `${path}.${child.key}` : child.key}
              relNamePath={[...relNamePath, child.key]}
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
  let directBind = true;

  if (CustomWidget) {
    control = (
      <CustomWidgetControl
        Component={CustomWidget}
        field={field}
        path={path}
        locale={locale}
        disabled={isFieldDisabled}
        brandPalette={props.brandPalette}
        error={errorMsg}
      />
    );
  } else if (!SUPPORTED_WIDGETS.has(field.widget)) {
    directBind = false;
    const msg =
      locale === 'en'
        ? `Unsupported widget: ${String(field.widget)}`
        : `Widget chưa hỗ trợ: ${String(field.widget)}`;
    control = (
      <Alert
        type="warning"
        showIcon
        data-widget-fallback={String(field.widget)}
        data-widget-unsupported={String(field.widget)}
        title={msg}
      />
    );
  } else if (field.widget === 'localized') {
    directBind = false;
    control = (
      <LocalizedWidgetControl
        field={field}
        label={label}
        relNamePath={relNamePath}
        rules={props.rules}
        disabled={isFieldDisabled}
      />
    );
  } else if (field.widget === 'list') {
    directBind = false;
    control = (
      <ListWidgetControl
        field={field}
        relNamePath={relNamePath}
        locale={locale}
        disabled={isFieldDisabled}
        renderItemFields={(lf, idx) => {
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
                    relNamePath={[lf.name, subField.key]}
                    disabled={isFieldDisabled}
                  />
                ))}
              </div>
            );
          }
          return (
            <AutoFormField
              {...props}
              field={field.item}
              path={itemPath}
              relNamePath={[lf.name]}
              disabled={isFieldDisabled}
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
      disabled: isFieldDisabled,
      brandPalette: props.brandPalette,
      slot: field.slotKey ? props.assetSlotMap.get(field.slotKey) : undefined,
      renderAssetPicker: props.renderAssetPicker,
      onPickAsset: props.onPickAsset,
    });
  }

  return (
    <div
      data-slot="autoform-field"
      data-widget={field.widget}
      data-field-path={path}
      data-disabled={isFieldDisabled ? 'true' : undefined}
    >
      <Form.Item
        name={directBind ? relNamePath : undefined}
        label={renderFieldLabel(field, label, locale)}
        valuePropName={field.widget === 'switch' ? 'checked' : 'value'}
        required={field.required}
        rules={directBind ? props.rules : undefined}
        validateStatus={errorMsg ? 'error' : undefined}
        extra={
          errorMsg ? (
            <span role="alert" data-slot="field-error">
              {errorMsg}
            </span>
          ) : (
            description || undefined
          )
        }
      >
        {control}
      </Form.Item>
    </div>
  );
}

export function AutoForm(props: AutoFormProps) {
  const {
    descriptor,
    value,
    onChange,
    locale = 'vi',
    configSchema,
    activeGroup,
    disabled,
    className,
  } = props;
  const [form] = Form.useForm<Record<string, unknown>>(props.form);
  const isGamePublished = Boolean(props.published || props.isPublished);
  const effectiveValue = React.useMemo(
    () => withFieldDefaults(descriptor.fields, value),
    [descriptor.fields, value],
  );

  React.useEffect(() => {
    if (JSON.stringify(form.getFieldsValue(true)) !== JSON.stringify(effectiveValue)) {
      form.setFieldsValue(effectiveValue);
    }
  }, [form, effectiveValue]);

  const rules = React.useMemo<FormRule[]>(
    () => (configSchema ? [zodRule(configSchema, form)] : []),
    [configSchema, form],
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

  const handleValuesChange = React.useCallback(
    (changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => {
      const changedPath = extractChangedPath(changedValues);
      let nextRoot: Record<string, unknown> = { ...effectiveValue, ...allValues };
      if (changedPath) {
        const changedField = findFieldByPath(descriptor.fields, changedPath);
        const changedVal = getValueAtPath(nextRoot, changedPath);
        const presetPatch =
          changedField?.presets && typeof changedVal === 'string'
            ? changedField.presets[changedVal]
            : undefined;
        if (presetPatch) {
          for (const [presetKey, presetVal] of Object.entries(presetPatch)) {
            nextRoot = setValueAtPath(nextRoot, presetKey, presetVal);
          }
          form.setFieldsValue(nextRoot);
        }
      }
      onChange(nextRoot, changedPath);
    },
    [descriptor.fields, effectiveValue, form, onChange],
  );

  const renderFields = (fields: readonly FieldDescriptor[]) => (
    <div className="grid gap-3">
      {fields.map((field) => (
        <AutoFormField
          key={field.path}
          field={field}
          path={field.path}
          relNamePath={toNamePath(field.path)}
          locale={locale}
          hotEditablePaths={descriptor.hotEditablePaths}
          published={isGamePublished}
          brandPalette={props.brandPalette}
          assetSlotMap={assetSlotMap}
          renderAssetPicker={props.renderAssetPicker}
          onPickAsset={props.onPickAsset}
          widgets={props.widgets}
          rules={rules}
          errors={props.errors}
          disabled={disabled}
        />
      ))}
    </div>
  );

  return (
    <div data-slot="auto-form" className={cn('grid gap-4', className)}>
      <Form
        form={form}
        layout="vertical"
        initialValues={effectiveValue}
        onValuesChange={handleValuesChange}
        disabled={disabled}
      >
        {groupedSections.length > 0 ? (
          <Collapse
            defaultActiveKey={groupedSections.map(([grp]) => grp)}
            items={groupedSections.map(([grp, list]) => ({
              key: grp,
              label: groupLabelFor(grp, locale),
              children: renderFields(list),
            }))}
          />
        ) : (
          renderFields(visibleFields)
        )}
      </Form>
    </div>
  );
}
