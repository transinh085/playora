'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { brandKitsApi, type MyOrg, Slug } from '@playora/contracts';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Description,
  FieldError,
  Input,
  Label,
  TextField,
  toast,
} from '@playora/ui/components';
import { cx } from '@playora/ui/utils/cx';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiCheckboxCircleFill,
  RiCheckLine,
  RiGift2Fill,
  RiGlobalLine,
  RiLinksLine,
  RiLogoutBoxRLine,
  RiSparklingFill,
  RiStore2Line,
  RiTicket2Line,
} from '@remixicon/react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Logo } from '@/components/logo';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useInvalidateMyOrgs } from '../api';

const schema = z.object({ name: z.string().trim().min(2).max(80), slug: Slug });
type Values = z.infer<typeof schema>;

export const ONBOARDING_BRAND_PRESETS = [
  {
    key: 'teal',
    hex: '#0f7c79',
    secondaryHex: '#facf4e',
    backgroundHex: '#fffdf9',
    surfaceHex: '#f5efe6',
    textHex: '#1c1917',
  },
  {
    key: 'festive',
    hex: '#c81e1e',
    secondaryHex: '#f59e0b',
    backgroundHex: '#fffbeb',
    surfaceHex: '#fef3c7',
    textHex: '#450a0a',
  },
  {
    key: 'milkTea',
    hex: '#d97706',
    secondaryHex: '#fde68a',
    backgroundHex: '#fffbeb',
    surfaceHex: '#fef3c7',
    textHex: '#451a03',
  },
  {
    key: 'matcha',
    hex: '#15803d',
    secondaryHex: '#bef264',
    backgroundHex: '#f7fee7',
    surfaceHex: '#ecfccb',
    textHex: '#14532d',
  },
  {
    key: 'coffee',
    hex: '#78350f',
    secondaryHex: '#fcd34d',
    backgroundHex: '#fffdf9',
    surfaceHex: '#f5efe6',
    textHex: '#292524',
  },
  {
    key: 'berry',
    hex: '#be185d',
    secondaryHex: '#fbcfe8',
    backgroundHex: '#fdf2f8',
    surfaceHex: '#fce7f3',
    textHex: '#500724',
  },
] as const;

export type OnboardingBrandPresetKey = (typeof ONBOARDING_BRAND_PRESETS)[number]['key'];

export const getOnboardingBrandStorageKey = (orgId: string) =>
  `playora_onboarding_brand_preset_${orgId}`;

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

export function OnboardingForm({ existingOrgs = [] }: { existingOrgs?: MyOrg[] }) {
  const t = useTranslations('onboarding');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const invalidateMyOrgs = useInvalidateMyOrgs();
  const { data: session } = authClient.useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presetKey, setPresetKey] = useState<OnboardingBrandPresetKey>('teal');

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '' },
  });

  const watchedName = form.watch('name').trim();
  const watchedSlug = form.watch('slug').trim();
  const selectedPreset =
    ONBOARDING_BRAND_PRESETS.find((p) => p.key === presetKey) ?? ONBOARDING_BRAND_PRESETS[0];

  const hasExistingOrgs = existingOrgs.length > 0;
  const firstExistingOrg = existingOrgs[0];

  async function onSubmit(rawValues: Values) {
    setIsSubmitting(true);
    try {
      const values = schema.parse(rawValues);
      const { data, error } = await authClient.organization.create(values);
      if (error || !data) {
        form.setError('slug', {
          message: error?.message ?? tCommon('unknownError'),
        });
        return;
      }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            getOnboardingBrandStorageKey(data.id),
            JSON.stringify({
              name: values.name,
              primaryColor: selectedPreset.hex,
              secondaryColor: selectedPreset.secondaryHex,
              accentColor: selectedPreset.secondaryHex,
              backgroundColor: selectedPreset.backgroundHex,
              surfaceColor: selectedPreset.surfaceHex,
              textColor: selectedPreset.textHex,
            }),
          );
        } catch {
          // Ignore storage quota errors
        }
      }
      await api
        .call(brandKitsApi.create, {
          params: { orgId: data.id },
          body: {
            name: values.name,
            tokens: {
              colors: {
                primary: selectedPreset.hex,
                secondary: selectedPreset.secondaryHex,
                accent: selectedPreset.secondaryHex,
                background: selectedPreset.backgroundHex,
                surface: selectedPreset.surfaceHex,
                text: selectedPreset.textHex,
              },
              fontHeading: 'Be Vietnam Pro',
              fontBody: 'Be Vietnam Pro',
              logoAssetId: null,
              backgroundAssetId: null,
              musicAssetId: null,
            },
          },
        })
        .catch(() => null);
      await invalidateMyOrgs();
      toast.success(values.name);
      router.replace(`/orgs/${data.id}` as Route);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.replace('/login');
    router.refresh();
  }

  const displayShopName = watchedName || 'Trà Sữa Mộc';
  const displaySlug = watchedSlug || 'tra-sua-moc';
  const displayInitial = displayShopName.slice(0, 1).toUpperCase();

  return (
    <main className="flex min-h-dvh flex-col justify-between bg-background-full p-4 sm:p-6 lg:p-10">
      {/* Top Minimal Header Bar */}
      <header className="mx-auto flex w-full max-w-[1020px] items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-4">
          <Logo className="text-text-primary" />
          {hasExistingOrgs && firstExistingOrg && (
            <Link
              href={`/orgs/${firstExistingOrg.id}` as Route}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-button-default bg-background-primary-default px-3 py-1.5 text-caption-1-medium text-text-secondary transition-colors hover:bg-background-secondary-hover hover:text-text-primary"
            >
              <RiArrowLeftLine className="size-3.5" />
              <span>{t('backToStudio')}</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {session?.user.email && (
            <span className="hidden max-w-[220px] truncate rounded-full bg-background-secondary-default px-3 py-1 text-caption-1-medium text-text-secondary sm:inline-block">
              {session.user.email}
            </span>
          )}
          <Button type="button" variant="ghost" size="sm" onPress={handleSignOut}>
            <RiLogoutBoxRLine className="size-4" />
            {tAuth('signOut')}
          </Button>
        </div>
      </header>

      {/* Center 2-Column Split Onboarding Card */}
      <Card className="mx-auto my-auto grid w-full max-w-[1020px] overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card lg:grid-cols-12">
        {/* Left Column: Store Setup Form */}
        <div className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-7">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Chip variant="soft" size="sm" color="accent" className="gap-1">
                <RiSparklingFill className="size-3.5" aria-hidden />
                <span>{t('stepBadge')}</span>
              </Chip>
            </div>

            <h1 className="m-0 text-title-2-semibold text-text-primary">
              {hasExistingOrgs ? t('additionalTitle') : t('title')}
            </h1>
            <p className="mt-1.5 mb-0 text-body-regular text-text-secondary">
              {hasExistingOrgs ? t('additionalDescription') : t('description')}
            </p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-5">
              <Controller
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <TextField
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      const slug = slugify(val);
                      form.setValue('slug', slug, { shouldValidate: true });
                    }}
                    isInvalid={!!fieldState.error}
                    fullWidth
                  >
                    <Label className="inline-flex items-center gap-1.5">
                      <RiStore2Line className="size-3.5 text-text-tertiary" />
                      {t('orgName')}
                    </Label>
                    <Input placeholder={t('orgNamePlaceholder')} />
                    {fieldState.error?.message ? (
                      <FieldError>{fieldState.error.message}</FieldError>
                    ) : (
                      <Description>{t('orgNameHint')}</Description>
                    )}
                  </TextField>
                )}
              />

              <Controller
                control={form.control}
                name="slug"
                render={({ field, fieldState }) => (
                  <TextField
                    value={field.value}
                    onChange={field.onChange}
                    isInvalid={!!fieldState.error}
                    fullWidth
                  >
                    <Label className="inline-flex items-center gap-1.5">
                      <RiLinksLine className="size-3.5 text-text-tertiary" />
                      {t('orgSlug')}
                    </Label>
                    <Input className="font-mono" />
                    {fieldState.error?.message ? (
                      <FieldError>{fieldState.error.message}</FieldError>
                    ) : (
                      <Description>{t('orgSlugHint')}</Description>
                    )}
                  </TextField>
                )}
              />

              {/* Suggested Brand Color Swatches */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-body-medium text-text-primary">{t('brandColorLabel')}</span>
                  <span className="text-caption-1-medium text-text-secondary">
                    {t(`presets.${presetKey}`)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {ONBOARDING_BRAND_PRESETS.map((preset) => {
                    const isSelected = preset.key === presetKey;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => setPresetKey(preset.key)}
                        aria-label={t(`presets.${preset.key}`)}
                        aria-pressed={isSelected}
                        className={cx(
                          'group relative flex items-center gap-2 rounded-xl border px-3 py-2 text-caption-1-medium transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                          isSelected
                            ? 'border-text-primary bg-background-secondary-default text-text-primary shadow-xs'
                            : 'border-border-button-default bg-background-primary-default text-text-secondary hover:bg-background-secondary-hover',
                        )}
                      >
                        <span
                          className="flex size-4 shrink-0 items-center justify-center rounded-full shadow-xs"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {isSelected && <RiCheckLine className="size-3 text-white" />}
                        </span>
                        <span>{t(`presets.${preset.key}`)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="m-0 text-caption-1-regular text-text-tertiary">
                  {t('brandColorHint')}
                </p>
              </div>

              <div className="pt-3">
                <Button type="submit" className="w-full sm:w-auto" isDisabled={isSubmitting}>
                  {t('submit')}
                  <RiArrowRightLine className="size-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Storefront & Starter Plan Preview */}
        <div className="flex flex-col justify-between border-t border-separator-border bg-background-secondary-default p-6 sm:p-8 lg:col-span-5 lg:border-t-0 lg:border-l">
          {/* Live Storefront Preview Card */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="text-caption-1-semibold text-text-secondary">
                {t('preview.badge')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-background-primary-default px-2.5 py-1 font-mono text-caption-2-medium text-text-secondary shadow-2xs">
                <RiGlobalLine className="size-3 text-foreground-icon-tertiary" />
                <span className="max-w-[190px] truncate">play.playora.vn/{displaySlug}</span>
              </span>
            </div>

            {/* Storefront Game Card Simulation */}
            <Card className="overflow-hidden border border-border-button-default bg-background-primary-default p-0 shadow-card">
              {/* Dynamic Brand Header Banner */}
              <div
                className="flex items-center gap-3 p-4 text-white transition-colors duration-300"
                style={{ backgroundColor: selectedPreset.hex }}
              >
                <Avatar size="md" className="rounded-xl bg-white/20 text-white backdrop-blur-xs">
                  <Avatar.Fallback className="bg-transparent font-display text-body-semibold font-bold text-white">
                    {displayInitial}
                  </Avatar.Fallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-caption-1-medium text-white/85">
                    {displayShopName}
                  </p>
                  <p className="m-0 truncate font-display text-body-2-semibold font-bold text-white">
                    {t('preview.sampleCampaign')}
                  </p>
                </div>
              </div>

              {/* Sample Prize & Counter Voucher Preview */}
              <Card.Content className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3 rounded-xl bg-background-secondary-default p-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: selectedPreset.hex }}
                  >
                    <RiGift2Fill className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-body-2-semibold text-text-primary">
                      {t('preview.samplePrize')}
                    </p>
                    <p className="m-0 flex items-center gap-1.5 text-caption-2-regular text-text-secondary">
                      <RiTicket2Line className="size-3 shrink-0" />
                      <span>{t('preview.voucherLabel')}:</span>
                      <strong className="font-mono tabular-nums text-text-primary">MỘC-68A</strong>
                    </p>
                  </div>
                </div>

                <div
                  className="flex h-9 w-full items-center justify-center rounded-xl font-display text-caption-1-semibold font-semibold text-white shadow-xs transition-colors duration-300"
                  style={{ backgroundColor: selectedPreset.hex }}
                >
                  {t('preview.samplePlayCta')}
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Starter Plan Perks Box */}
          <Card className="mt-6 border border-border-button-default bg-background-primary-default p-4">
            <Card.Header className="p-0">
              <Card.Title className="m-0 text-caption-1-semibold text-text-primary">
                {t('preview.planTitle')}
              </Card.Title>
            </Card.Header>
            <Card.Content className="p-0">
              <ul className="mt-2.5 mb-0 flex list-none flex-col gap-2 p-0">
                <li className="flex items-start gap-2 text-caption-1-regular text-text-secondary">
                  <RiCheckboxCircleFill className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('preview.planPerk1')}</span>
                </li>
                <li className="flex items-start gap-2 text-caption-1-regular text-text-secondary">
                  <RiCheckboxCircleFill className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('preview.planPerk2')}</span>
                </li>
                <li className="flex items-start gap-2 text-caption-1-regular text-text-secondary">
                  <RiCheckboxCircleFill className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('preview.planPerk3')}</span>
                </li>
              </ul>
            </Card.Content>
          </Card>
        </div>
      </Card>

      {/* Bottom spacer for balanced vertical centering */}
      <div className="h-2" />
    </main>
  );
}
