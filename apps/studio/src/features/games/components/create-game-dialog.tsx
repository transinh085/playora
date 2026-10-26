'use client';

import { CreateGameBody, type ErrorCode, localize, type TemplateSummary } from '@playora/contracts';
import { applyApiError, useZodForm } from '@playora/ui/form';
import { App, Button, Card, Form, Input, Modal, Radio, Tag, Typography, theme } from 'antd';
import { Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Caption } from '@/components/caption';
import { useCreateGame } from '../api';

export function CreateGameDialog({
  orgId,
  eventId,
  templates,
}: {
  orgId: string;
  eventId: string;
  templates: readonly TemplateSummary[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [open, setOpen] = useState(false);

  const { form, rules, parse } = useZodForm(CreateGameBody);
  const selectedTemplateId = Form.useWatch('templateId', form);
  const selectedTemplate: TemplateSummary | undefined =
    templates.find((tpl) => tpl.id === selectedTemplateId) ?? templates[0];

  useEffect(() => {
    if (open && selectedTemplate && !form.getFieldValue('name')) {
      form.setFieldsValue({
        templateId: selectedTemplate.id,
        name: localize(selectedTemplate.name, locale),
        skinKey: selectedTemplate.skins[0]?.key ?? 'chung',
      });
    }
  }, [open, selectedTemplate, locale, form]);

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const createMutation = useCreateGame({
    onSuccess: (created) => {
      message.success(t('games.created', { name: created.name }));
      setOpen(false);
      form.resetFields();
    },
    onError: (err) => {
      if (!applyApiError(form, err, messageFor)) {
        message.error(messageFor(err.code));
      }
    },
  });

  function handleSelectTemplate(tpl: TemplateSummary) {
    const currentName = form.getFieldValue('name');
    const shouldReplaceName =
      !currentName || templates.some((item) => localize(item.name, locale) === currentName);

    form.setFieldsValue({
      templateId: tpl.id,
      ...(shouldReplaceName ? { name: localize(tpl.name, locale) } : {}),
      ...(tpl.skins[0] ? { skinKey: tpl.skins[0].key } : {}),
    });
  }

  return (
    <>
      <Button
        type="primary"
        icon={<Plus className="size-4" />}
        data-testid="add-game-button"
        onClick={() => setOpen(true)}
      >
        {t('games.addGame')}
      </Button>

      <Modal
        title={t('games.galleryTitle')}
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={640}
        destroyOnHidden
      >
        <div data-testid="template-gallery-dialog" className="flex flex-col gap-4">
          <Typography.Text type="secondary">{t('games.galleryDescription')}</Typography.Text>

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              templateId: selectedTemplate?.id ?? 'spin-wheel',
              name: selectedTemplate ? localize(selectedTemplate.name, locale) : '',
              skinKey: selectedTemplate?.skins[0]?.key ?? 'chung',
            }}
            onFinish={(values) => {
              const body = parse(values);
              createMutation.mutate({ params: { orgId, eventId }, body });
            }}
          >
            <Form.Item name="templateId" hidden rules={rules}>
              <Input />
            </Form.Item>

            <div className="mb-4 grid gap-3 sm:grid-cols-2" data-testid="template-gallery-list">
              {templates.map((tpl) => {
                const isSelected = tpl.id === selectedTemplate?.id;
                return (
                  <Card
                    key={tpl.id}
                    size="small"
                    data-testid={`template-card-${tpl.id}`}
                    onClick={() => handleSelectTemplate(tpl)}
                    style={isSelected ? { borderColor: token.colorPrimary } : undefined}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Radio checked={isSelected}>
                        <Typography.Text strong>{localize(tpl.name, locale)}</Typography.Text>
                      </Radio>
                      <Tag variant="filled" className="!m-0">
                        {tpl.kind}
                      </Tag>
                    </div>
                    <div className="mt-1">
                      <Caption>{localize(tpl.description, locale)}</Caption>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {tpl.tags.map((tag) => (
                        <Tag key={tag} variant="filled" className="!m-0">
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Form.Item name="name" label={t('games.gameNameLabel')} rules={rules}>
                <Input
                  data-testid="new-game-name-input"
                  placeholder={t('games.gameNamePlaceholder')}
                />
              </Form.Item>

              <Form.Item name="skinKey" label={t('games.skinLabel')} rules={rules}>
                <Radio.Group
                  data-testid="new-game-skin-select"
                  optionType="button"
                  buttonStyle="solid"
                  options={(selectedTemplate?.skins ?? []).map((skin) => ({
                    value: skin.key,
                    label: localize(skin.name, locale),
                  }))}
                />
              </Form.Item>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button
                type="primary"
                htmlType="submit"
                data-testid="confirm-add-game"
                loading={createMutation.isPending}
              >
                {t('games.createGame')}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </>
  );
}
