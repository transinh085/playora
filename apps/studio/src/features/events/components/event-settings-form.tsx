'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  type ErrorCode,
  type EventStatus,
  type IdentityMode,
  ParticipationIdentityMode,
  RegistrationFieldType,
  UpdateEventBody,
} from '@playora/contracts';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@playora/ui/components/card';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { Separator } from '@playora/ui/components/separator';
import { Skeleton } from '@playora/ui/components/skeleton';
import { Textarea } from '@playora/ui/components/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { useBrandKits } from '@/features/brand-kits/api';
import { applyApiError } from '@/lib/form-errors';
import { useEvent, useUpdateEvent } from '../api';

type Values = z.input<typeof UpdateEventBody>;

const NONE_KIT = '__none__';
const EVENT_STATUSES: EventStatus[] = ['draft', 'scheduled', 'live', 'ended', 'archived'];
const PARTICIPATION_MODES = ParticipationIdentityMode.options;
const FIELD_TYPES = RegistrationFieldType.options;

export function EventSettingsForm({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();

  const eventQuery = useEvent(orgId, eventId);
  const kitsQuery = useBrandKits(orgId, 100);

  const form = useForm<Values>({
    resolver: zodResolver(UpdateEventBody),
    defaultValues: {
      name: '',
      brandKitId: null,
      status: 'draft',
      identity: 'anonymous',
      registrationForm: { fields: [], consents: [] },
    },
  });

  const fieldsArray = useFieldArray({
    control: form.control,
    name: 'registrationForm.fields',
  });

  const consentsArray = useFieldArray({
    control: form.control,
    name: 'registrationForm.consents',
  });

  useEffect(() => {
    if (eventQuery.data) {
      form.reset({
        name: eventQuery.data.name,
        brandKitId: eventQuery.data.brandKitId,
        status: eventQuery.data.status,
        identity: eventQuery.data.identity,
        registrationForm: {
          fields: eventQuery.data.registrationForm?.fields ?? [],
          consents: eventQuery.data.registrationForm?.consents ?? [],
        },
      });
    }
  }, [eventQuery.data, form]);

  const update = useUpdateEvent({
    onSuccess: () => {
      toast.success(t('events.saved'));
    },
    onError: (err) => {
      const messageFor = (code: ErrorCode) => t(`errors.${code}`);
      if (!applyApiError(err, form.setError, messageFor)) toast.error(messageFor(err.code));
    },
  });

  if (eventQuery.isPending || kitsQuery.isPending) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }
  if (eventQuery.isError) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-destructive">{t('common.unknownError')}</span>
        <Button variant="outline" size="sm" onClick={() => eventQuery.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const brandKitId = form.watch('brandKitId');
  const status = form.watch('status') ?? 'draft';
  const identity = form.watch('identity') ?? 'anonymous';
  const watchedFields = form.watch('registrationForm.fields') ?? [];
  const watchedConsents = form.watch('registrationForm.consents') ?? [];
  const { errors } = form.formState;

  return (
    <form
      className="grid gap-6"
      onSubmit={form.handleSubmit((body) => update.mutate({ params: { orgId, eventId }, body }))}
    >
      <Card>
        <CardHeader>
          <CardTitle>{eventQuery.data.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="settings-event-name">{t('events.name')}</Label>
            <Input
              id="settings-event-name"
              aria-invalid={!!errors.name}
              {...form.register('name')}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t('events.brandKit')}</Label>
              <Select
                value={brandKitId ?? NONE_KIT}
                onValueChange={(v) => form.setValue('brandKitId', v === NONE_KIT ? null : v)}
              >
                <SelectTrigger className="w-full" aria-label={t('events.brandKit')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_KIT}>{t('events.noBrandKit')}</SelectItem>
                  {(kitsQuery.data?.items ?? []).map((kit) => (
                    <SelectItem key={kit.id} value={kit.id}>
                      {kit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('events.status')}</Label>
              <Select
                value={status}
                onValueChange={(v) => form.setValue('status', v as EventStatus)}
              >
                <SelectTrigger className="w-full" aria-label={t('events.status')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {t(`events.statuses.${st}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('events.participationTitle')}</CardTitle>
          <CardDescription>{t('events.participationDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label>{t('events.identity')}</Label>
            <Select
              value={
                PARTICIPATION_MODES.includes(identity as (typeof PARTICIPATION_MODES)[number])
                  ? identity
                  : 'anonymous'
              }
              onValueChange={(v) => form.setValue('identity', v as IdentityMode)}
            >
              <SelectTrigger className="w-full" aria-label={t('events.identity')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARTICIPATION_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {t(`events.identityModes.${mode}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{t('events.formTitle')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  fieldsArray.append({
                    key: `field_${fieldsArray.fields.length + 1}`,
                    type: 'text',
                    label: { vi: '' },
                    required: false,
                  })
                }
              >
                <Plus className="size-4" />
                {t('events.addField')}
              </Button>
            </div>

            {fieldsArray.fields.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                {t('events.formEmpty')}
              </p>
            ) : (
              <div className="grid gap-4">
                {fieldsArray.fields.map((fieldItem, idx) => {
                  const currentType = watchedFields[idx]?.type ?? 'text';
                  const currentOptions = (watchedFields[idx]?.options ?? []).join(', ');
                  const fieldErrors = errors.registrationForm?.fields?.[idx];

                  return (
                    <div key={fieldItem.id} className="grid gap-3 rounded-lg border p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label htmlFor={`field-key-${idx}`}>{t('events.fieldKey')}</Label>
                          <Input
                            id={`field-key-${idx}`}
                            placeholder="full_name"
                            aria-invalid={!!fieldErrors?.key}
                            {...form.register(`registrationForm.fields.${idx}.key`)}
                          />
                          {fieldErrors?.key && (
                            <p className="text-destructive text-xs">{fieldErrors.key.message}</p>
                          )}
                        </div>

                        <div className="grid gap-1.5">
                          <Label>{t('events.fieldType')}</Label>
                          <Select
                            value={currentType}
                            onValueChange={(v) =>
                              form.setValue(
                                `registrationForm.fields.${idx}.type`,
                                v as (typeof FIELD_TYPES)[number],
                              )
                            }
                          >
                            <SelectTrigger
                              className="w-full"
                              aria-label={`${t('events.fieldType')} ${idx + 1}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((ft) => (
                                <SelectItem key={ft} value={ft}>
                                  {t(`events.fieldTypes.${ft}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label htmlFor={`field-label-vi-${idx}`}>
                            {t('events.fieldLabelVi')}
                          </Label>
                          <Input
                            id={`field-label-vi-${idx}`}
                            aria-invalid={!!fieldErrors?.label?.vi}
                            {...form.register(`registrationForm.fields.${idx}.label.vi`)}
                          />
                          {fieldErrors?.label?.vi && (
                            <p className="text-destructive text-xs">
                              {fieldErrors.label.vi.message}
                            </p>
                          )}
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor={`field-label-en-${idx}`}>
                            {t('events.fieldLabelEn')}
                          </Label>
                          <Input
                            id={`field-label-en-${idx}`}
                            {...form.register(`registrationForm.fields.${idx}.label.en`)}
                          />
                        </div>
                      </div>

                      {currentType === 'select' && (
                        <div className="grid gap-1.5">
                          <Label htmlFor={`field-options-${idx}`}>{t('events.fieldOptions')}</Label>
                          <Input
                            id={`field-options-${idx}`}
                            defaultValue={currentOptions}
                            onChange={(e) => {
                              const opts = e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              form.setValue(`registrationForm.fields.${idx}.options`, opts, {
                                shouldValidate: true,
                              });
                            }}
                          />
                          {fieldErrors?.options && (
                            <p className="text-destructive text-xs">
                              {fieldErrors.options.message}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <label
                          htmlFor={`field-required-${idx}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            id={`field-required-${idx}`}
                            type="checkbox"
                            className="size-4 accent-primary"
                            {...form.register(`registrationForm.fields.${idx}.required`)}
                          />
                          {t('events.fieldRequired')}
                        </label>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => fieldsArray.remove(idx)}
                          aria-label={t('events.removeField')}
                        >
                          <Trash2 className="size-4" />
                          {t('events.removeField')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{t('events.consentsTitle')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  consentsArray.append({
                    purpose:
                      consentsArray.fields.length === 0
                        ? 'participation'
                        : `consent_${consentsArray.fields.length + 1}`,
                    text: { vi: '' },
                    required: true,
                  })
                }
              >
                <Plus className="size-4" />
                {t('events.addConsent')}
              </Button>
            </div>

            {consentsArray.fields.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                {t('events.consentsEmpty')}
              </p>
            ) : (
              <div className="grid gap-4">
                {consentsArray.fields.map((consentItem, idx) => {
                  const consentErrors = errors.registrationForm?.consents?.[idx];
                  const savedVersion = watchedConsents[idx]?.textVersion;

                  return (
                    <div key={consentItem.id} className="grid gap-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="grid flex-1 gap-1.5">
                          <Label htmlFor={`consent-purpose-${idx}`}>
                            {t('events.consentPurpose')}
                          </Label>
                          <Input
                            id={`consent-purpose-${idx}`}
                            placeholder="participation"
                            aria-invalid={!!consentErrors?.purpose}
                            {...form.register(`registrationForm.consents.${idx}.purpose`)}
                          />
                          {consentErrors?.purpose && (
                            <p className="text-destructive text-xs">
                              {consentErrors.purpose.message}
                            </p>
                          )}
                        </div>
                        {savedVersion && <Badge variant="secondary">{savedVersion}</Badge>}
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor={`consent-text-vi-${idx}`}>
                          {t('events.consentTextVi')}
                        </Label>
                        <Textarea
                          id={`consent-text-vi-${idx}`}
                          rows={2}
                          aria-invalid={!!consentErrors?.text?.vi}
                          {...form.register(`registrationForm.consents.${idx}.text.vi`)}
                        />
                        {consentErrors?.text?.vi && (
                          <p className="text-destructive text-xs">
                            {consentErrors.text.vi.message}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor={`consent-text-en-${idx}`}>
                          {t('events.consentTextEn')}
                        </Label>
                        <Input
                          id={`consent-text-en-${idx}`}
                          {...form.register(`registrationForm.consents.${idx}.text.en`)}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label
                          htmlFor={`consent-required-${idx}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            id={`consent-required-${idx}`}
                            type="checkbox"
                            className="size-4 accent-primary"
                            {...form.register(`registrationForm.consents.${idx}.required`)}
                          />
                          {t('events.consentRequired')}
                        </label>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => consentsArray.remove(idx)}
                          aria-label={t('events.removeConsent')}
                        >
                          <Trash2 className="size-4" />
                          {t('events.removeConsent')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={update.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
