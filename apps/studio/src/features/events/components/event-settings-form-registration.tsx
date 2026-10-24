'use client';

import {
  ParticipationIdentityMode,
  RegistrationFieldType,
  UpdateEventBody,
} from '@playora/contracts';
import { zodRule } from '@playora/ui/form';
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  type FormInstance,
  type FormRule,
  Input,
  Select,
  Typography,
} from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';
import { EventConsentsList } from './event-settings-form-consents';

type Values = z.input<typeof UpdateEventBody>;
type FieldItem = NonNullable<NonNullable<Values['registrationForm']>['fields']>[number];
type ConsentItem = NonNullable<NonNullable<Values['registrationForm']>['consents']>[number];

export const PARTICIPATION_MODES = ParticipationIdentityMode.options;
const FIELD_TYPES = RegistrationFieldType.options;

function CommaOptionsInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value?: string[];
  onChange?: (next: string[]) => void;
}) {
  const joined = useMemo(() => (value ?? []).join(', '), [value]);
  const [raw, setRaw] = useState(joined);

  useEffect(() => {
    const parsedFromRaw = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(', ');
    if (parsedFromRaw !== joined) {
      setRaw(joined);
    }
  }, [joined, raw]);

  return (
    <Input
      id={id}
      value={raw}
      onChange={(e) => {
        const nextText = e.target.value;
        setRaw(nextText);
        const opts = nextText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        onChange?.(opts);
      }}
    />
  );
}

export function EventRegistrationSection({
  form,
  rules,
  initialFields,
  initialConsents,
}: {
  form: FormInstance<Values>;
  rules: FormRule[];
  initialFields?: FieldItem[];
  initialConsents?: ConsentItem[];
}) {
  const t = useTranslations();

  const watchedFields = Form.useWatch(['registrationForm', 'fields'], form) ?? initialFields ?? [];

  const listRules = useMemo(() => [zodRule(UpdateEventBody, form)], [form]);

  const identityOptions = useMemo(
    () =>
      PARTICIPATION_MODES.map((mode) => ({
        value: mode,
        label: t(`events.identityModes.${mode}`),
      })),
    [t],
  );

  const fieldTypeOptions = useMemo(
    () =>
      FIELD_TYPES.map((ft) => ({
        value: ft,
        label: t(`events.fieldTypes.${ft}`),
      })),
    [t],
  );

  return (
    <Card title={t('events.participationTitle')}>
      <div className="grid gap-6">
        <Typography.Paragraph type="secondary" className="mb-0 text-sm">
          {t('events.participationDescription')}
        </Typography.Paragraph>

        <Form.Item name="identity" label={t('events.identity')} rules={rules} className="mb-0">
          <Select aria-label={t('events.identity')} options={identityOptions} />
        </Form.Item>

        <Divider className="my-0" />

        <Form.List name={['registrationForm', 'fields']} rules={listRules}>
          {(fields, { add, remove }, { errors }) => (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <Typography.Text strong className="text-base">
                  {t('events.formTitle')}
                </Typography.Text>
                <Button
                  htmlType="button"
                  size="small"
                  icon={<Plus className="size-4" />}
                  onClick={() =>
                    add({
                      key: `field_${fields.length + 1}`,
                      type: 'text',
                      label: { vi: '' },
                      required: false,
                    })
                  }
                >
                  {t('events.addField')}
                </Button>
              </div>

              {fields.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--ant-color-border)] p-4 text-center text-sm text-[var(--ant-color-text-secondary)]">
                  {t('events.formEmpty')}
                </p>
              ) : (
                <div className="grid gap-4">
                  {fields.map((field, idx) => {
                    const currentType = watchedFields[idx]?.type ?? 'text';
                    return (
                      <div
                        key={field.key}
                        className="grid gap-3 rounded-lg border border-[var(--ant-color-border)] p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Form.Item
                            name={[field.name, 'key']}
                            label={t('events.fieldKey')}
                            rules={rules}
                            className="mb-0"
                          >
                            <Input placeholder="full_name" />
                          </Form.Item>

                          <Form.Item
                            name={[field.name, 'type']}
                            label={t('events.fieldType')}
                            rules={rules}
                            className="mb-0"
                          >
                            <Select
                              aria-label={`${t('events.fieldType')} ${idx + 1}`}
                              options={fieldTypeOptions}
                            />
                          </Form.Item>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Form.Item
                            name={[field.name, 'label', 'vi']}
                            label={t('events.fieldLabelVi')}
                            rules={rules}
                            className="mb-0"
                          >
                            <Input />
                          </Form.Item>

                          <Form.Item
                            name={[field.name, 'label', 'en']}
                            label={t('events.fieldLabelEn')}
                            rules={rules}
                            className="mb-0"
                          >
                            <Input />
                          </Form.Item>
                        </div>

                        {currentType === 'select' && (
                          <Form.Item
                            name={[field.name, 'options']}
                            label={t('events.fieldOptions')}
                            rules={rules}
                            className="mb-0"
                          >
                            <CommaOptionsInput />
                          </Form.Item>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <Form.Item
                            name={[field.name, 'required']}
                            valuePropName="checked"
                            initialValue={false}
                            noStyle
                          >
                            <Checkbox>{t('events.fieldRequired')}</Checkbox>
                          </Form.Item>

                          <Button
                            htmlType="button"
                            type="text"
                            danger
                            size="small"
                            icon={<Trash2 className="size-4" />}
                            onClick={() => remove(field.name)}
                            aria-label={t('events.removeField')}
                          >
                            {t('events.removeField')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Form.ErrorList errors={errors} />
            </div>
          )}
        </Form.List>

        <Divider className="my-0" />

        <EventConsentsList form={form} rules={rules} initialConsents={initialConsents} />
      </div>
    </Card>
  );
}
