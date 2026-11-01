'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  Input,
  InputGroup,
  Label,
  ListBox,
  Select,
  Switch,
  Tooltip,
  toast,
} from '@playora/ui/components';
import { applyApiErrorToRHF } from '@playora/ui/form';
import { ArrowLeft, Coins, Gift, Percent, Plus, Trash2 } from '@playora/ui/icons';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Caption } from '@/components/caption';
import { MetricCard } from '@/components/metric-card';
import { useBrandKits } from '@/features/brand-kits/api';
import { useCreateCampaign } from '../../api';
import { brandFromKit } from '../../lib/brand';
import {
  defaultSetup,
  localDate,
  PLAYBOOKS,
  type PlaybookKey,
  type PlaybookSetup,
} from '../../lib/playbooks';
import { campaignRoutes } from '../../lib/routes';
import { formatVnd, toPercent } from '../../lib/rules-format';
import { WEEKDAYS, weekdayKey } from '../../lib/rules-summary';
import { type PlaybookSuggestion, suggestPlaybook } from '../../lib/suggest';
import { RulesSummary } from '../rules/rules-sentences-step';

const DEBOUNCE_MS = 250;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_QUIET_DAYS = [2, 3, 4];

type SetupErrorKey =
  | 'name'
  | 'budget'
  | 'prizes'
  | 'prizeName'
  | 'prizeCost'
  | 'date'
  | 'endBeforeStart'
  | 'endInPast'
  | 'time'
  | 'hoursOrder'
  | 'openDays'
  | 'guests';

function setupSchema(m: (key: SetupErrorKey) => string, today: string) {
  const date = z.string().regex(DATE, m('date'));
  const time = z.string().regex(TIME, m('time'));
  return z
    .object({
      name: z.string().trim().min(1, m('name')).max(120, m('name')),
      budgetVnd: z
        .number({ error: m('budget') })
        .int()
        .min(10_000, m('budget'))
        .max(10_000_000_000),
      prizes: z
        .array(
          z.object({
            name: z.string().trim().min(1, m('prizeName')).max(120, m('prizeName')),
            costVnd: z
              .number({ error: m('prizeCost') })
              .int()
              .min(0, m('prizeCost'))
              .max(1_000_000_000),
            weight: z.number().min(0),
            quantity: z.number().int().min(0).max(1_000_000).optional(),
            image: z.string().optional(),
          }),
        )
        .min(1, m('prizes'))
        .max(20),
      startDate: date,
      endDate: date,
      openingHours: z.object({ start: time, end: time }).nullable(),
      openDays: z.array(z.number().int().min(0).max(6)).min(1, m('openDays')).nullable(),
      guestsPerDay: z
        .number({ error: m('guests') })
        .int()
        .min(1, m('guests'))
        .max(100_000),
      baselineGuestsPerDay: z.number().int().min(1).max(100_000).nullable().optional(),
    })
    .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: m('endBeforeStart') })
    .refine((v) => v.endDate >= today, { path: ['endDate'], message: m('endInPast') })
    .refine((v) => !v.openingHours || v.openingHours.start < v.openingHours.end, {
      path: ['openingHours', 'end'],
      message: m('hoursOrder'),
    });
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function PlaybookSetupForm({
  orgId,
  playbook,
  onBack,
}: {
  orgId: string;
  playbook: PlaybookKey;
  onBack: () => void;
}) {
  const t = useTranslations('builderLab.playbooks');
  const tw = useTranslations('builderLab.weekdays');
  const router = useRouter();
  const create = useCreateCampaign(orgId);
  const brandKits = useBrandKits(orgId);
  const pb = PLAYBOOKS[playbook];
  const [selectedBrandKitId, setSelectedBrandKitId] = useState<string>('default');

  useEffect(() => {
    if (brandKits.data?.items[0]?.id && selectedBrandKitId === 'default') {
      setSelectedBrandKitId(brandKits.data.items[0].id);
    }
  }, [brandKits.data?.items, selectedBrandKitId]);

  const [initial] = useState(() => defaultSetup(playbook, t(`items.${playbook}.defaultName`)));
  const schema = useMemo(
    () => setupSchema((key: SetupErrorKey) => t(`setup.errors.${key}`), localDate()),
    [t],
  );

  const form = useForm<PlaybookSetup>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'prizes',
  });

  const watched = useWatch({ control: form.control });
  const key = useDebounced(JSON.stringify({ ...initial, ...watched }), DEBOUNCE_MS);
  const values = useMemo(() => JSON.parse(key) as PlaybookSetup, [key]);

  const suggestion = useMemo((): PlaybookSuggestion | null => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) return null;
    try {
      return suggestPlaybook(playbook, parsed.data);
    } catch {
      return null;
    }
  }, [values, schema, playbook]);

  const hasZeroCostPrize = (values.prizes ?? []).some((p) => p.costVnd === 0);

  const onSubmit = async (setup: PlaybookSetup) => {
    const s = suggestPlaybook(playbook, setup);
    try {
      const chosenKit =
        selectedBrandKitId && selectedBrandKitId !== 'default'
          ? brandKits.data?.items.find((k) => k.id === selectedBrandKitId)
          : undefined;
      const submittedPrizes = s.prizes.map((p) => ({
        ...p,
        quantity: Math.max(1, p.quantity),
      }));
      const campaign = await create.mutateAsync({
        name: setup.name.trim(),
        templateKey: pb.templateKey,
        skinKey: pb.skinKey,
        brand: brandFromKit(chosenKit),
        brandKit: chosenKit,
        playbook,
        prizes: submittedPrizes,
        rules: s.rules,
      });
      toast.success(t('suggestion.created'));
      router.push(campaignRoutes(orgId).edit(campaign.id));
    } catch (error) {
      if (!applyApiErrorToRHF(form.setError, error)) {
        toast.error(t('suggestion.createFailed'));
      }
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          {t('backToGoals')}
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden p-0">
          <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-6 py-4">
            <div>
              <Caption className="block">{t('setup.title')}</Caption>
              <Card.Title className="m-0 text-headline-semibold text-text-primary">
                {t(`items.${playbook}.title`)}
              </Card.Title>
            </div>
            <Chip variant="soft" color="default">
              {t(`items.${playbook}.goal`)}
            </Chip>
          </Card.Header>
          <Card.Content className="p-6">
            <form id="playbook-setup" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="setup-name">{t('setup.name')}</Label>
                    <Input id="setup-name" maxLength={120} fullWidth {...field} />
                    {fieldState.error?.message && (
                      <p className="text-caption-regular text-danger">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              {/* Brand Kit Selector */}
              {(brandKits.data?.items.length ?? 0) > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label>{t('setup.brandKit')}</Label>
                  <Select
                    aria-label={t('setup.brandKit')}
                    selectedKey={selectedBrandKitId}
                    onSelectionChange={(k) => k !== null && setSelectedBrandKitId(String(k))}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="default" textValue={t('setup.defaultBrandKit')}>
                          {t('setup.defaultBrandKit')}
                        </ListBox.Item>
                        {(brandKits.data?.items ?? []).map((kit) => (
                          <ListBox.Item key={kit.id} id={kit.id} textValue={kit.name}>
                            {kit.name}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              )}

              <Controller
                control={form.control}
                name="budgetVnd"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="setup-budget">{t('setup.budget')}</Label>
                    <InputGroup fullWidth>
                      <InputGroup.Input
                        id="setup-budget"
                        type="number"
                        step={1000}
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                      <InputGroup.Suffix>đ</InputGroup.Suffix>
                    </InputGroup>
                    <p className="text-caption-regular text-text-secondary">
                      {t('setup.budgetHint')}
                    </p>
                    {fieldState.error?.message && (
                      <p className="text-caption-regular text-danger">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />

              <div className="space-y-3">
                <div>
                  <span className="text-body-medium text-text-primary">{t('setup.prizes')}</span>
                  <Caption className="block">{t('setup.prizesHint')}</Caption>
                </div>

                {hasZeroCostPrize && (
                  <Alert status="warning" data-testid="zero-cost-prize-warning">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{t('setup.zeroCostHint')}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}

                <div className="space-y-2.5">
                  {fields.map((fieldItem, index) => {
                    const quantity = suggestion?.prizes[index]?.quantity;
                    return (
                      <div
                        key={fieldItem.id}
                        className="flex items-center gap-2.5 rounded-2xl border border-border-button-default bg-background-secondary-default/40 p-3"
                        data-testid="playbook-prize"
                      >
                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_140px_100px]">
                          <Controller
                            control={form.control}
                            name={`prizes.${index}.name`}
                            render={({ field, fieldState }) => (
                              <div className="space-y-0">
                                <Input
                                  placeholder={t('setup.prizeName')}
                                  aria-label={t('setup.prizeName')}
                                  maxLength={120}
                                  fullWidth
                                  {...field}
                                />
                                {fieldState.error?.message && (
                                  <p className="text-caption-regular text-danger">
                                    {fieldState.error.message}
                                  </p>
                                )}
                              </div>
                            )}
                          />

                          <Controller
                            control={form.control}
                            name={`prizes.${index}.costVnd`}
                            render={({ field, fieldState }) => (
                              <div className="space-y-0">
                                <InputGroup fullWidth>
                                  <InputGroup.Input
                                    type="number"
                                    step={1000}
                                    min={0}
                                    aria-label={t('setup.prizeCost')}
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                  <InputGroup.Suffix>đ</InputGroup.Suffix>
                                </InputGroup>
                                {fieldState.error?.message && (
                                  <p className="text-caption-regular text-danger">
                                    {fieldState.error.message}
                                  </p>
                                )}
                              </div>
                            )}
                          />

                          <Controller
                            control={form.control}
                            name={`prizes.${index}.quantity`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                aria-label={t('setup.prizeQuantity')}
                                placeholder={quantity !== undefined ? String(quantity) : '—'}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const raw = e.target.value.trim();
                                  field.onChange(raw === '' ? undefined : Number(raw));
                                }}
                              />
                            )}
                          />
                        </div>

                        <Chip
                          variant="soft"
                          color={quantity === 0 ? 'danger' : 'default'}
                          className="shrink-0 tabular-nums"
                          data-testid="playbook-prize-quantity"
                        >
                          {quantity === undefined
                            ? '—'
                            : t('suggestion.quantity', { count: quantity })}
                        </Chip>

                        <Tooltip delay={150}>
                          <Tooltip.Trigger>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              isIconOnly
                              className="size-8 p-0 text-text-error-primary hover:bg-notification-error-background"
                              isDisabled={fields.length <= 1}
                              onClick={() => remove(index)}
                              aria-label={t('setup.removePrize')}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>{t('setup.removePrize')}</Tooltip.Content>
                        </Tooltip>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center border-dashed"
                    isDisabled={fields.length >= 20}
                    onClick={() => {
                      const current = form.getValues('prizes') ?? [];
                      const weight =
                        current.length > 0
                          ? current.reduce((s, p) => s + (p.weight ?? 0), 0) / current.length
                          : 1;
                      append({
                        name: t('setup.newPrize', { n: current.length + 1 }),
                        costVnd: 10_000,
                        weight,
                        image: 'gift',
                      });
                    }}
                  >
                    <Plus className="size-4" />
                    {t('setup.addPrize')}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="startDate"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="setup-start-date">{t('setup.startDate')}</Label>
                      <Input id="setup-start-date" type="date" fullWidth {...field} />
                      {fieldState.error?.message && (
                        <p className="text-caption-regular text-danger">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />

                <Controller
                  control={form.control}
                  name="endDate"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="setup-end-date">{t('setup.endDate')}</Label>
                      <Input id="setup-end-date" type="date" fullWidth {...field} />
                      {fieldState.error?.message && (
                        <p className="text-caption-regular text-danger">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />

                <Controller
                  control={form.control}
                  name="openingHours.start"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="setup-hours-start">{t('setup.hoursStart')}</Label>
                      <Input
                        id="setup-hours-start"
                        type="time"
                        fullWidth
                        {...field}
                        value={field.value ?? ''}
                      />
                      {fieldState.error?.message && (
                        <p className="text-caption-regular text-danger">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />

                <Controller
                  control={form.control}
                  name="openingHours.end"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="setup-hours-end">{t('setup.hoursEnd')}</Label>
                      <Input
                        id="setup-hours-end"
                        type="time"
                        fullWidth
                        {...field}
                        value={field.value ?? ''}
                      />
                      {fieldState.error?.message && (
                        <p className="text-caption-regular text-danger">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Open Days on all playbooks */}
              <Controller
                control={form.control}
                name="openDays"
                render={({ field, fieldState }) => {
                  const isCustomDays = field.value !== null;
                  const currentDays = field.value ?? [];
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>{t('setup.openDays')}</Label>
                        <Switch
                          aria-label={t('setup.openDays')}
                          isSelected={isCustomDays}
                          onChange={(on) =>
                            field.onChange(on ? (pb.openDays ?? DEFAULT_QUIET_DAYS) : null)
                          }
                        >
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch>
                      </div>
                      <Caption>
                        {isCustomDays ? t('setup.openDaysCustom') : t('setup.openDaysAll')}
                      </Caption>
                      {isCustomDays && (
                        <div className="flex flex-wrap gap-4 pt-1">
                          {WEEKDAYS.map((d) => {
                            const checked = currentDays.includes(d);
                            return (
                              <Checkbox
                                key={d}
                                isSelected={checked}
                                onChange={(val) => {
                                  if (val) {
                                    field.onChange([...currentDays, d]);
                                  } else {
                                    field.onChange(currentDays.filter((x) => x !== d));
                                  }
                                }}
                              >
                                <Checkbox.Control>
                                  <Checkbox.Indicator />
                                </Checkbox.Control>
                                <Checkbox.Content>
                                  <Label>{tw(weekdayKey(d))}</Label>
                                </Checkbox.Content>
                              </Checkbox>
                            );
                          })}
                        </div>
                      )}
                      {fieldState.error?.message && (
                        <p className="text-caption-regular text-danger">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  );
                }}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="guestsPerDay"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="setup-guests">{t('setup.guests')}</Label>
                      <Input
                        id="setup-guests"
                        type="number"
                        min={1}
                        max={100_000}
                        step={10}
                        fullWidth
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                      <p className="text-caption-regular text-text-secondary">
                        {t('setup.guestsHint')}
                      </p>
                      {fieldState.error?.message && (
                        <p className="text-caption-regular text-danger">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />

                {/* Optional normal-day guest baseline (PLB-08) */}
                <Controller
                  control={form.control}
                  name="baselineGuestsPerDay"
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="setup-baseline-guests">{t('setup.baselineGuests')}</Label>
                      <Input
                        id="setup-baseline-guests"
                        data-testid="setup-baseline-guests"
                        type="number"
                        min={1}
                        max={100_000}
                        step={10}
                        fullWidth
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          field.onChange(raw === '' ? null : Number(raw));
                        }}
                      />
                      <p className="text-caption-regular text-text-secondary">
                        {t('setup.baselineGuestsHint')}
                      </p>
                      {fieldState.error?.message && (
                        <p className="text-caption-regular text-danger">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </div>
            </form>
          </Card.Content>
        </Card>

        <div className="xl:sticky xl:top-4">
          <SuggestionCard
            suggestion={suggestion}
            budgetVnd={values.budgetVnd}
            pending={create.isPending}
          />
        </div>
      </div>
    </div>
  );
}

export function SuggestionCard({
  suggestion,
  budgetVnd,
  pending,
}: {
  suggestion: PlaybookSuggestion | null;
  budgetVnd: number;
  pending: boolean;
}) {
  const t = useTranslations('builderLab.playbooks.suggestion');
  const locale = useLocale();
  const zero = suggestion?.prizes.filter((p) => p.quantity === 0) ?? [];

  return (
    <Card className="overflow-hidden p-0">
      <Card.Header className="border-b border-separator-border px-6 py-4">
        <Card.Title className="m-0 text-headline-semibold text-text-primary">
          {t('title')}
        </Card.Title>
      </Card.Header>
      <Card.Content className="p-6">
        {!suggestion ? (
          <div className="space-y-4">
            <Caption className="block">{t('invalid')}</Caption>
            <Button
              variant="primary"
              type="submit"
              form="playbook-setup"
              className="w-full justify-center"
              isDisabled
              data-testid="playbook-create-submit"
            >
              {t('create')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="playbook-suggestion">
            <p className="m-0 text-body-medium text-text-primary">
              {t('sentence', {
                budget: formatVnd(budgetVnd, locale),
                count: suggestion.totalPrizes,
                oneIn: suggestion.oneIn,
                days: suggestion.days,
              })}
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              <MetricCard
                label={t('winRate')}
                value={`${toPercent(suggestion.winRate)}%`}
                subtext={t('winRateSub', { oneIn: suggestion.oneIn })}
                icon={<Percent className="size-4" />}
                tone="primary"
              />
              <MetricCard
                label={t('prizes')}
                value={String(suggestion.totalPrizes)}
                subtext={t('prizesSub', { plays: suggestion.expectedPlays })}
                icon={<Gift className="size-4" />}
                tone="info"
              />
              <MetricCard
                label={t('cost')}
                value={formatVnd(suggestion.totalCostVnd, locale)}
                subtext={t('costSub', { budget: formatVnd(budgetVnd, locale) })}
                icon={<Coins className="size-4" />}
                tone="success"
              />
            </div>

            <Caption className="block">
              {t('risk', { percent: toPercent(suggestion.risk) })}
            </Caption>

            {suggestion.tooFewPrizes && (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{t('tooFew')}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {zero.map((p) => (
              <Alert key={p.id} status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{t('zeroPrize', { name: p.name })}</Alert.Description>
                </Alert.Content>
              </Alert>
            ))}

            <RulesSummary rules={suggestion.rules} prizes={suggestion.prizes} />

            <Caption className="block">{t('editLater')}</Caption>

            <Button
              variant="primary"
              type="submit"
              form="playbook-setup"
              className="w-full justify-center"
              isDisabled={pending || suggestion.totalPrizes === 0}
              data-testid="playbook-create-submit"
            >
              {t('create')}
            </Button>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
