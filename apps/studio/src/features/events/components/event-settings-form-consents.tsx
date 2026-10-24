'use client';

import { UpdateEventBody } from '@playora/contracts';
import { zodRule } from '@playora/ui/form';
import {
  Button,
  Checkbox,
  Form,
  type FormInstance,
  type FormRule,
  Input,
  Tag,
  Typography,
} from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { z } from 'zod';

type Values = z.input<typeof UpdateEventBody>;
type ConsentItem = NonNullable<NonNullable<Values['registrationForm']>['consents']>[number];

export function EventConsentsList({
  form,
  rules,
  initialConsents,
}: {
  form: FormInstance<Values>;
  rules: FormRule[];
  initialConsents?: ConsentItem[];
}) {
  const t = useTranslations();

  const watchedConsents =
    Form.useWatch(['registrationForm', 'consents'], form) ?? initialConsents ?? [];

  const listRules = useMemo(() => [zodRule(UpdateEventBody, form)], [form]);

  return (
    <Form.List name={['registrationForm', 'consents']} rules={listRules}>
      {(fields, { add, remove }, { errors }) => (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Typography.Text strong className="text-base">
              {t('events.consentsTitle')}
            </Typography.Text>
            <Button
              htmlType="button"
              size="small"
              icon={<Plus className="size-4" />}
              onClick={() =>
                add({
                  purpose: fields.length === 0 ? 'participation' : `consent_${fields.length + 1}`,
                  text: { vi: '' },
                  required: true,
                })
              }
            >
              {t('events.addConsent')}
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--ant-color-border)] p-4 text-center text-sm text-[var(--ant-color-text-secondary)]">
              {t('events.consentsEmpty')}
            </p>
          ) : (
            <div className="grid gap-4">
              {fields.map((field, idx) => {
                const savedVersion = watchedConsents[idx]?.textVersion;
                return (
                  <div
                    key={field.key}
                    className="grid gap-3 rounded-lg border border-[var(--ant-color-border)] p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Form.Item
                        name={[field.name, 'purpose']}
                        label={t('events.consentPurpose')}
                        rules={rules}
                        className="mb-0 flex-1"
                      >
                        <Input placeholder="participation" />
                      </Form.Item>
                      {savedVersion && <Tag className="m-0">{savedVersion}</Tag>}
                    </div>

                    <Form.Item
                      name={[field.name, 'text', 'vi']}
                      label={t('events.consentTextVi')}
                      rules={rules}
                      className="mb-0"
                    >
                      <Input.TextArea rows={2} />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, 'text', 'en']}
                      label={t('events.consentTextEn')}
                      rules={rules}
                      className="mb-0"
                    >
                      <Input />
                    </Form.Item>

                    <div className="flex items-center justify-between pt-1">
                      <Form.Item
                        name={[field.name, 'required']}
                        valuePropName="checked"
                        initialValue={true}
                        noStyle
                      >
                        <Checkbox>{t('events.consentRequired')}</Checkbox>
                      </Form.Item>

                      <Button
                        htmlType="button"
                        type="text"
                        danger
                        size="small"
                        icon={<Trash2 className="size-4" />}
                        onClick={() => remove(field.name)}
                        aria-label={t('events.removeConsent')}
                      >
                        {t('events.removeConsent')}
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
  );
}
