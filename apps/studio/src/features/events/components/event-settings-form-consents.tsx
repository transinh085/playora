'use client';

import { UpdateEventBody } from '@playora/contracts';
import { zodRule } from '@playora/ui/form';
import {
  Button,
  Card,
  Checkbox,
  Empty,
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
            <Typography.Title level={5} className="!m-0">
              {t('events.consentsTitle')}
            </Typography.Title>
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
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('events.consentsEmpty')} />
          ) : (
            <div className="grid gap-4">
              {fields.map((field, idx) => {
                const savedVersion = watchedConsents[idx]?.textVersion;
                return (
                  <Card key={field.key} size="small">
                    <div className="grid gap-3">
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
                        <Form.Item name={[field.name, 'required']} valuePropName="checked" noStyle>
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
                  </Card>
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
