'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertTitle } from '@playora/ui/components/alert';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import { Checkbox } from '@playora/ui/components/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@playora/ui/components/form';
import { Input } from '@playora/ui/components/input';
import { toast } from '@playora/ui/components/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@playora/ui/components/tooltip';
import { applyApiErrorToRHF } from '@playora/ui/form';
import { ArrowLeft, Coins, Gift, Percent, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
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
              .min(1, m('prizeCost'))
              .max(1_000_000_000),
            weight: z.number().min(0),
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

  const onSubmit = async (setup: PlaybookSetup) => {
    const s = suggestPlaybook(playbook, setup);
    try {
      const campaign = await create.mutateAsync({
        name: setup.name.trim(),
        templateKey: pb.templateKey,
        skinKey: pb.skinKey,
        brand: brandFromKit(brandKits.data?.items[0]),
        playbook,
        prizes: s.prizes.filter((p) => p.quantity > 0),
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
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="outline" className="gap-2" onClick={onBack}>
          <ArrowLeft className="size-4" />
          {t('backToGoals')}
        </Button>
      </div>

      <div className="grid items-start gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-2xl border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <Caption>{t('setup.title')}</Caption>
              <CardTitle className="text-base font-semibold">
                {t(`items.${playbook}.title`)}
              </CardTitle>
            </div>
            <Badge variant="secondary">{t(`items.${playbook}.goal`)}</Badge>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                id="playbook-setup"
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('setup.name')}</FormLabel>
                      <FormControl>
                        <Input maxLength={120} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budgetVnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('setup.budget')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step={1000}
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>{t('setup.budgetHint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold">{t('setup.prizes')}</span>
                    <Caption className="block">{t('setup.prizesHint')}</Caption>
                  </div>

                  <div className="space-y-2">
                    {fields.map((fieldItem, index) => {
                      const quantity = suggestion?.prizes[index]?.quantity;
                      return (
                        <div
                          key={fieldItem.id}
                          className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3"
                          data-testid="playbook-prize"
                        >
                          <div className="grid min-w-0 flex-1 gap-2 grid-cols-[minmax(0,1fr)_160px]">
                            <FormField
                              control={form.control}
                              name={`prizes.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      placeholder={t('setup.prizeName')}
                                      aria-label={t('setup.prizeName')}
                                      maxLength={120}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`prizes.${index}.costVnd`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step={1000}
                                      min={0}
                                      aria-label={t('setup.prizeCost')}
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <Badge
                            variant={quantity === 0 ? 'destructive' : 'secondary'}
                            className="shrink-0 tabular-nums"
                            data-testid="playbook-prize-quantity"
                          >
                            {quantity === undefined
                              ? '—'
                              : t('suggestion.quantity', { count: quantity })}
                          </Badge>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={fields.length <= 1}
                                onClick={() => remove(index)}
                                aria-label={t('setup.removePrize')}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('setup.removePrize')}</TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 border-dashed"
                      disabled={fields.length >= 20}
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
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('setup.startDate')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('setup.endDate')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openingHours.start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('setup.hoursStart')}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="openingHours.end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('setup.hoursEnd')}</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {initial.openDays !== null && (
                  <FormField
                    control={form.control}
                    name="openDays"
                    render={({ field }) => {
                      const currentDays = field.value ?? [];
                      return (
                        <FormItem>
                          <FormLabel>{t('setup.openDays')}</FormLabel>
                          <div className="flex flex-wrap gap-4 pt-1">
                            {WEEKDAYS.map((d) => {
                              const checked = currentDays.includes(d);
                              return (
                                <label
                                  key={d}
                                  htmlFor={`open-day-${d}`}
                                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                                >
                                  <Checkbox
                                    id={`open-day-${d}`}
                                    checked={checked}
                                    onCheckedChange={(val) => {
                                      if (val) {
                                        field.onChange([...currentDays, d]);
                                      } else {
                                        field.onChange(currentDays.filter((x) => x !== d));
                                      }
                                    }}
                                  />
                                  <span>{tw(weekdayKey(d))}</span>
                                </label>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                <FormField
                  control={form.control}
                  name="guestsPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('setup.guests')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100_000}
                          step={10}
                          className="max-w-xs"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>{t('setup.guestsHint')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
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
    <Card className="rounded-2xl border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestion === null ? (
          <Alert>
            <AlertTitle>{t('invalid')}</AlertTitle>
          </Alert>
        ) : (
          <div className="space-y-4" data-testid="playbook-suggestion">
            <p className="text-sm font-semibold">
              {t('sentence', {
                budget: formatVnd(budgetVnd, locale),
                count: suggestion.totalPrizes,
                oneIn: suggestion.oneIn,
                days: suggestion.openDays,
              })}
            </p>
            <div className="grid gap-3">
              <MetricCard
                label={t('prizes')}
                value={suggestion.totalPrizes}
                subtext={t('prizesSub', { plays: suggestion.expectedPlays })}
                icon={<Gift className="size-5" />}
                tone="success"
              />
              <MetricCard
                label={t('winRate')}
                value={`${toPercent(suggestion.winRate)}%`}
                subtext={t('winRateSub', { oneIn: suggestion.oneIn })}
                icon={<Percent className="size-5" />}
                tone="primary"
              />
              <MetricCard
                label={t('cost')}
                value={formatVnd(suggestion.totalCostVnd, locale)}
                subtext={t('costSub', { budget: formatVnd(budgetVnd, locale) })}
                icon={<Coins className="size-5" />}
                tone="warning"
              />
            </div>
            {suggestion.tooFewPrizes ? (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <AlertTitle>{t('tooFew')}</AlertTitle>
              </Alert>
            ) : (
              <Caption>{t('risk', { percent: Math.round(suggestion.risk * 100) })}</Caption>
            )}
            {zero.map((p) => (
              <Alert
                key={p.id}
                className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              >
                <AlertTitle>{t('zeroPrize', { name: p.name })}</AlertTitle>
              </Alert>
            ))}
            <RulesSummary rules={suggestion.rules} prizes={suggestion.prizes} />
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="submit"
            form="playbook-setup"
            className="w-full rounded-full"
            disabled={pending || suggestion === null || suggestion.totalPrizes === 0}
          >
            {t('create')}
          </Button>
          <Caption className="text-center">{t('editLater')}</Caption>
        </div>
      </CardContent>
    </Card>
  );
}
