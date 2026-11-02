'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { InputBase } from '@playora/ui/components/base/input/input';
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@playora/ui/components/base/modal/modal';
import { Select, SelectItem } from '@playora/ui/components/base/select/select';
import { toast } from '@playora/ui/components/base/toast/toast';
import { cx } from '@playora/ui/utils/cx';
import {
  RiCheckLine,
  RiEditLine,
  RiGiftLine,
  RiMagicLine,
  RiPaletteLine,
  RiQrCodeLine,
  RiSparklingLine,
  RiTimeLine,
} from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useBrandKits } from '@/features/brand-kits/api';
import { useCreateCampaign } from '@/features/builder-lab/api';
import { brandFromKit } from '@/features/builder-lab/lib/brand';
import { campaignRoutes } from '@/features/builder-lab/lib/routes';
import type { CatalogTemplate } from '../data/mock-templates';

type DurationKey = '7d' | '14d' | '30d';
type WinRateKey = 'high' | 'medium' | 'low';

export function CreateFromTemplateDialog({
  orgId,
  template,
  isOpen,
  onClose,
}: {
  orgId: string;
  template: CatalogTemplate | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('templatesCatalog.createModal');
  const router = useRouter();
  const create = useCreateCampaign(orgId);
  const brandKits = useBrandKits(orgId);

  const [step, setStep] = useState<'setup' | 'success'>('setup');
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState<DurationKey>('14d');
  const [winRate, setWinRate] = useState<WinRateKey>('high');
  const [selectedBrandKitId, setSelectedBrandKitId] = useState<string | undefined>(undefined);

  // Cache template in ref so modal content stays populated during 300ms exit transition
  const lastTemplateRef = useRef<CatalogTemplate | null>(template);
  if (template) {
    lastTemplateRef.current = template;
  }
  const displayTemplate = template ?? lastTemplateRef.current;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setStep('setup');
      setCreatedCampaignId(null);
      if (brandKits.data?.items[0]?.id && !selectedBrandKitId) {
        setSelectedBrandKitId(brandKits.data.items[0].id);
      }
    }
  }, [template, brandKits.data?.items, selectedBrandKitId]);

  if (!displayTemplate) return null;

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const chosenKit =
      brandKits.data?.items.find((k) => k.id === selectedBrandKitId) ?? brandKits.data?.items[0];

    try {
      // Map to real M1 template engine if real, or fallback to real engine equivalent for M2 mock
      const effectiveTemplateKey = displayTemplate.realTemplateKey ?? 'spin-wheel';
      const effectiveSkinKey: 'tet' | 'grand-opening' | 'everyday' =
        displayTemplate.isReal &&
        (displayTemplate.skinKey === 'grand-opening' || displayTemplate.skinKey === 'everyday')
          ? displayTemplate.skinKey
          : 'tet';

      const campaign = await create.mutateAsync({
        templateKey: effectiveTemplateKey,
        skinKey: effectiveSkinKey,
        name: name.trim(),
        brand: brandFromKit(chosenKit),
      });

      if (!displayTemplate.isReal) {
        toast.info(t('m2FallbackNotice'));
      } else {
        toast.success(t('createdSuccess'));
      }

      setCreatedCampaignId(campaign.id);
      setStep('success');
    } catch {
      toast.error(t('createFailed'));
    }
  };

  const handleFinishAndGoToManage = () => {
    if (!createdCampaignId) return;
    onClose();
    router.push(campaignRoutes(orgId).detail(createdCampaignId));
  };

  const handleFinishAndGoToCanvas = () => {
    if (!createdCampaignId) return;
    onClose();
    router.push(campaignRoutes(orgId).edit(createdCampaignId));
  };

  return (
    <Modal
      size="lg"
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          // Reset back to setup step after drawer/modal closes
          setTimeout(() => setStep('setup'), 300);
        }
      }}
    >
      <div className="w-full">
        {step === 'setup' ? (
          <>
            <ModalHeader title={t('step1Title')} description={t('step1Subtitle')} />

            <ModalBody>
              <div className="flex flex-col gap-5 py-1">
                {/* Template Summary Card */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-border-card-default bg-background-tertiary-default/50 p-3.5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background-primary-default border border-border-card-default text-text-primary shadow-2xs">
                    <RiSparklingLine className="size-5 text-accent-500" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-body-2-semibold text-text-primary truncate">
                      {displayTemplate.name}
                    </span>
                    <span className="text-caption-1-regular text-text-tertiary truncate">
                      {displayTemplate.skinName} · {displayTemplate.playDuration} ·{' '}
                      {displayTemplate.engineKind === 'instant' ? 'Instant-win' : 'Skill game'}
                    </span>
                  </div>
                </div>

                {/* Campaign Name Input */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="campaign-name"
                    className="text-caption-1-medium text-text-secondary"
                  >
                    {t('nameLabel')}
                  </label>
                  <InputBase
                    id="campaign-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    autoFocus
                  />
                </div>

                {/* Preset Duration Pills */}
                <div className="space-y-2">
                  <span className="text-caption-1-medium text-text-secondary flex items-center gap-1.5">
                    <RiTimeLine className="size-3.5" />
                    {t('durationLabel')}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['7d', '14d', '30d'] as const).map((durKey) => (
                      <button
                        type="button"
                        key={durKey}
                        onClick={() => setDuration(durKey)}
                        className={cx(
                          'flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer',
                          duration === durKey
                            ? 'border-accent-500 bg-accent-500/10 text-accent-700 dark:text-accent-300 font-medium shadow-2xs ring-1 ring-accent-500/30'
                            : 'border-border-card-default bg-background-primary-default text-text-secondary hover:border-border-card-hover',
                        )}
                      >
                        <span className="text-caption-1-semibold">
                          {durKey === '7d' ? '7 ngày' : durKey === '14d' ? '14 ngày' : '30 ngày'}
                        </span>
                        <span className="text-[10px] text-text-tertiary">
                          {durKey === '7d'
                            ? 'Thử nghiệm'
                            : durKey === '14d'
                              ? 'Chuẩn 2 tuần'
                              : 'Cả tháng'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Win Rate Strategy Pills */}
                <div className="space-y-2">
                  <span className="text-caption-1-medium text-text-secondary flex items-center gap-1.5">
                    <RiGiftLine className="size-3.5" />
                    {t('winRateLabel')}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['high', 'medium', 'low'] as const).map((rateKey) => (
                      <button
                        type="button"
                        key={rateKey}
                        onClick={() => setWinRate(rateKey)}
                        className={cx(
                          'flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer',
                          winRate === rateKey
                            ? 'border-accent-500 bg-accent-500/10 text-accent-700 dark:text-accent-300 font-medium shadow-2xs ring-1 ring-accent-500/30'
                            : 'border-border-card-default bg-background-primary-default text-text-secondary hover:border-border-card-hover',
                        )}
                      >
                        <span className="text-caption-1-semibold">
                          {rateKey === 'high' ? '80%' : rateKey === 'medium' ? '50%' : '30%'}
                        </span>
                        <span className="text-[10px] text-text-tertiary">
                          {rateKey === 'high'
                            ? 'Dễ trúng quà'
                            : rateKey === 'medium'
                              ? 'Cân bằng F&B'
                              : 'Thử thách quà to'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand Kit Selector */}
                <div className="space-y-1.5">
                  <span className="text-caption-1-medium text-text-secondary flex items-center gap-1.5">
                    <RiPaletteLine className="size-3.5" />
                    {t('brandKitLabel')}
                  </span>
                  <Select
                    size="sm"
                    aria-label={t('brandKitLabel')}
                    placeholder={t('defaultBrandKit')}
                    selectedKey={selectedBrandKitId ?? null}
                    onSelectionChange={(key) => key !== null && setSelectedBrandKitId(String(key))}
                  >
                    {(brandKits.data?.items ?? []).map((kit) => (
                      <SelectItem key={kit.id} id={kit.id} textValue={kit.name}>
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3.5 shrink-0 rounded-full border border-border-card-default"
                            style={{ background: kit.tokens.colors.primary }}
                          />
                          <span>{kit.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="secondary" size="small" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                size="small"
                leadingIcon={RiMagicLine}
                disabled={!name.trim() || create.isPending}
                onClick={handleSubmit}
              >
                {create.isPending ? t('creating') : t('submitButton')}
              </Button>
            </ModalFooter>
          </>
        ) : (
          /* Step 2: ORA Success Celebration */
          <div className="flex flex-col items-center px-6 py-2 text-center">
            {/* ORA Celebrating Mascot Graphic */}
            <div className="relative mb-3 flex items-center justify-center">
              <div className="absolute size-32 rounded-full bg-emerald-500/10 blur-xl animate-pulse" />
              {/* biome-ignore lint/performance/noImgElement: static mascot graphic */}
              <img
                src="/assets/ora-success.png"
                alt="ORA Celebrates Success"
                className="relative size-32 sm:size-36 object-contain drop-shadow-md select-none"
              />
            </div>

            <h3 className="text-title-1-semibold tracking-tight text-text-primary">
              {t('step2Title')}
            </h3>

            <p className="mt-2 text-body-medium text-text-secondary max-w-sm leading-relaxed">
              {t('step2Subtitle')}
            </p>

            {/* Campaign Summary Badge */}
            <div className="mt-4 flex w-full flex-col gap-2 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3.5 text-left text-caption-1-medium">
              <div className="flex items-center justify-between text-text-primary">
                <span className="font-semibold truncate">{name}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <RiCheckLine className="size-3" />
                  Sẵn sàng
                </span>
              </div>
              <div className="flex items-center gap-3 text-caption-2-regular text-text-secondary">
                <span>
                  Lịch: {duration === '7d' ? '7 ngày' : duration === '14d' ? '14 ngày' : '30 ngày'}
                </span>
                <span>•</span>
                <span>
                  Tỷ lệ trúng: {winRate === 'high' ? '80%' : winRate === 'medium' ? '50%' : '30%'}
                </span>
              </div>
            </div>

            {/* 2 Clear Action Paths */}
            <div className="mt-6 flex w-full flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="medium"
                leadingIcon={RiEditLine}
                className="w-full sm:w-auto flex-1 justify-center whitespace-normal"
                onClick={handleFinishAndGoToCanvas}
              >
                {t('goToCanvas')}
              </Button>
              <Button
                variant="primary"
                size="medium"
                leadingIcon={RiQrCodeLine}
                className="w-full sm:w-auto flex-1 justify-center whitespace-normal font-medium"
                onClick={handleFinishAndGoToManage}
              >
                {t('goToManage')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
