'use client';

import { ApiError } from '@playora/api-client';
import { ErrorCode, localize, type PublicEvent, publicApi } from '@playora/contracts';
import {
  MAX_FORM_FIELD_VALUE_LENGTH,
  validateRegistration,
} from '@playora/core/registration/validate';
import { applyApiError, toNamePath } from '@playora/ui/form';
import { GameButton } from '@playora/ui/game/game-button';
import { GameRoot } from '@playora/ui/game/game-root';
import { JoinPanel } from '@playora/ui/game/join-panel';
import type { BrandKitTheme } from '@playora/ui/lib/game-theme';
import { Alert, Checkbox, Form, Input, Radio } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { getOrCreateDeviceId, usePlayerSession } from './session';

export interface JoinFormValues {
  code?: string;
  displayName?: string;
  fields?: Record<string, string | boolean | undefined>;
  consents?: Record<string, boolean>;
}

type FieldName = Parameters<
  ReturnType<typeof Form.useForm<JoinFormValues>>[0]['setFields']
>[0][number]['name'];

function isJoinFormFieldPath(path: unknown): path is string {
  if (typeof path !== 'string') return false;
  return (
    path === 'code' ||
    path === 'displayName' ||
    path.startsWith('fields.') ||
    path.startsWith('consents.')
  );
}

export function EventJoinShell({ event }: { event: PublicEvent }) {
  const locale = useLocale();
  const t = useTranslations('play');
  const tErrors = useTranslations('errors');
  const { session, hydrated, setSession } = usePlayerSession(event.slug);
  const [form] = Form.useForm<JoinFormValues>();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialValues = useMemo<JoinFormValues>(() => {
    const fields: Record<string, string | boolean> = {};
    for (const f of event.registrationForm.fields) {
      fields[f.key] = f.type === 'checkbox' ? false : '';
    }
    const consents: Record<string, boolean> = {};
    for (const c of event.consents) {
      consents[c.purpose] = false;
    }
    return {
      code: '',
      displayName: '',
      fields,
      consents,
    };
  }, [event.registrationForm.fields, event.consents]);

  const brandTheme = useMemo<BrandKitTheme | undefined>(() => {
    if (!event.brandKit) return undefined;
    return {
      primary: event.brandKit.colors.primary,
      accent: event.brandKit.colors.secondary,
      background: event.brandKit.colors.background,
      text: event.brandKit.colors.text,
      fontDisplay: event.brandKit.fontHeading,
    };
  }, [event.brandKit]);

  const bgStyle = useMemo(() => {
    if (!event.brandKit?.backgroundUrl) return undefined;
    return {
      backgroundImage: `linear-gradient(to bottom, oklch(0 0 0 / 55%), oklch(0 0 0 / 75%)), url(${event.brandKit.backgroundUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }, [event.brandKit?.backgroundUrl]);

  function clearFieldErrors() {
    form.setFields([
      { name: ['code'] as unknown as FieldName, errors: [] },
      { name: ['displayName'] as unknown as FieldName, errors: [] },
      ...event.registrationForm.fields.map((f) => ({
        name: ['fields', f.key] as unknown as FieldName,
        errors: [] as string[],
      })),
      ...event.consents.map((c) => ({
        name: ['consents', c.purpose] as unknown as FieldName,
        errors: [] as string[],
      })),
    ]);
  }

  async function handleSubmit(values: JoinFormValues) {
    setErrorMsg(null);
    clearFieldErrors();

    if (event.identity === 'guest_list' && !values.code?.trim()) {
      form.setFields([
        {
          name: ['code'] as unknown as FieldName,
          errors: [t('joinCodeRequired')],
        },
      ]);
      return;
    }

    const validation = validateRegistration(
      {
        fields: event.registrationForm.fields,
        consents: event.consents,
      },
      {
        fields: values.fields,
        consents: values.consents,
      },
    );

    if (!validation.ok) {
      form.setFields([
        {
          name: toNamePath(validation.field) as unknown as FieldName,
          errors: [validation.message],
        },
      ]);
      return;
    }

    setSubmitting(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const consentsPayload: Record<string, boolean> = {};
      for (const [purpose, granted] of validation.consentsMap.entries()) {
        consentsPayload[purpose] = granted;
      }

      const data = await api.call(publicApi.join, {
        params: { slug: event.slug },
        body: {
          deviceId,
          displayName: values.displayName?.trim() || undefined,
          code: event.identity === 'guest_list' ? values.code?.trim() || undefined : undefined,
          fields: event.registrationForm.fields.length > 0 ? validation.formData : undefined,
          consents: event.consents.length > 0 ? consentsPayload : undefined,
        },
      });

      setSession(data);
    } catch (err) {
      if (err instanceof ApiError) {
        const translateCode = (code: ErrorCode) =>
          code in ErrorCode ? tErrors(code) : err.message || t('joinFailed');
        const detailsField =
          err.details && typeof err.details === 'object' && 'field' in err.details
            ? (err.details as { field?: unknown }).field
            : undefined;
        const canAttachToField = detailsField === undefined || isJoinFormFieldPath(detailsField);

        if (canAttachToField && applyApiError(form, err, translateCode)) {
          return;
        }
        setErrorMsg(translateCode(err.code));
        return;
      }
      setErrorMsg(t('networkError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GameRoot brand={brandTheme} style={bgStyle} className="flex flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
        <header className="flex flex-col items-center gap-3 text-center">
          {event.brandKit?.logoUrl && (
            // biome-ignore lint/performance/noImgElement: presigned S3 URLs have dynamic hosts
            <img
              src={event.brandKit.logoUrl}
              alt={event.name}
              className="h-16 w-auto object-contain"
            />
          )}
          <p className="text-game-muted text-sm font-medium">{t('welcomeTo')}</p>
          <h1 className="font-game text-3xl font-bold text-balance">{event.name}</h1>
          <JoinPanel
            url={`play.playora.vn/${event.slug}`}
            className="mt-1 justify-center rounded-game border border-game-border bg-game-surface px-4 py-2.5 text-left text-sm"
          />
        </header>

        {hydrated && session ? (
          <section
            data-testid="player-lobby"
            className="flex flex-col items-center gap-3 rounded-game border border-game-border bg-game-surface p-6 text-center backdrop-blur-sm"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-game-primary/20 px-3 py-1 text-sm font-semibold text-game-primary">
              <span className="size-2 rounded-full bg-game-primary" />
              {t('joinedWaiting')}
            </span>
            <p className="font-game text-2xl font-bold" data-testid="player-display-name">
              {session.player.displayName}
            </p>
            {session.player.team && (
              <p className="text-game-muted text-base font-medium" data-testid="player-team">
                {t('teamLabel')}{' '}
                <span className="text-game-fg font-semibold">{session.player.team}</span>
              </p>
            )}
          </section>
        ) : event.status === 'draft' ? (
          <p className="text-game-muted text-center">{t('eventDraftNotice')}</p>
        ) : (
          <Form<JoinFormValues>
            form={form}
            layout="vertical"
            initialValues={initialValues}
            onFinish={handleSubmit}
            requiredMark={(label, { required }) => (
              <span className="text-sm font-semibold text-game-fg">
                {label}
                {required && <span className="text-game-urgent"> *</span>}
              </span>
            )}
            className="grid gap-4 rounded-game border border-game-border bg-game-surface p-5 backdrop-blur-sm"
          >
            {event.playerLimitReached && event.identity !== 'guest_list' && (
              <Alert
                role="alert"
                type="error"
                showIcon={false}
                title={tErrors('PLAYER_LIMIT_REACHED')}
                className="text-center text-sm font-medium"
              />
            )}

            {event.identity === 'guest_list' && (
              <Form.Item name="code" label={t('joinCode')} required className="mb-0 text-left">
                <Input size="large" placeholder={t('joinCodePlaceholder')} />
              </Form.Item>
            )}

            {event.identity === 'anonymous' && (
              <Form.Item name="displayName" label={t('displayName')} className="mb-0 text-left">
                <Input size="large" maxLength={120} placeholder={t('displayNamePlaceholder')} />
              </Form.Item>
            )}

            {event.registrationForm.fields.map((field) => {
              const fieldLabel = localize(field.label, locale);
              if (field.type === 'checkbox') {
                return (
                  <Form.Item
                    key={field.key}
                    name={['fields', field.key]}
                    valuePropName="checked"
                    className="mb-0 text-left"
                  >
                    <Checkbox>
                      <span className="text-base text-game-fg">
                        {fieldLabel}
                        {field.required && <span className="text-game-urgent"> *</span>}
                      </span>
                    </Checkbox>
                  </Form.Item>
                );
              }

              if (field.type === 'select') {
                const options = field.options ?? [];
                return (
                  <Form.Item
                    key={field.key}
                    name={['fields', field.key]}
                    label={fieldLabel}
                    required={field.required}
                    className="mb-0 text-left"
                  >
                    {options.length <= 5 ? (
                      <Radio.Group
                        className="flex flex-col gap-2"
                        options={options.map((opt) => ({
                          label: opt,
                          value: opt,
                        }))}
                      />
                    ) : (
                      <select className="h-10 w-full rounded-game border border-game-border bg-game-surface px-3 text-base text-game-fg outline-none">
                        <option value="" disabled>
                          {t('selectPlaceholder')}
                        </option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                  </Form.Item>
                );
              }

              const inputType =
                field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text';
              return (
                <Form.Item
                  key={field.key}
                  name={['fields', field.key]}
                  label={fieldLabel}
                  required={field.required}
                  className="mb-0 text-left"
                >
                  <Input size="large" type={inputType} maxLength={MAX_FORM_FIELD_VALUE_LENGTH} />
                </Form.Item>
              );
            })}

            {event.consents.length > 0 && (
              <div className="grid gap-3 border-t border-game-border pt-3 text-left">
                {event.consents.map((consent) => {
                  const consentText = localize(consent.text, locale);
                  return (
                    <Form.Item
                      key={consent.purpose}
                      name={['consents', consent.purpose]}
                      valuePropName="checked"
                      className="mb-0"
                    >
                      <Checkbox>
                        <span className="text-sm leading-relaxed text-game-fg">
                          {consentText}
                          {consent.required && <span className="text-game-urgent"> *</span>}
                        </span>
                      </Checkbox>
                    </Form.Item>
                  );
                })}
              </div>
            )}

            {errorMsg && (
              <Alert
                role="alert"
                type="error"
                showIcon={false}
                title={errorMsg}
                className="text-center text-sm font-medium"
              />
            )}

            <GameButton htmlType="submit" size="lg" disabled={submitting} className="mt-2 w-full">
              {submitting ? t('joining') : t('joinSubmit')}
            </GameButton>
          </Form>
        )}
      </main>
    </GameRoot>
  );
}
