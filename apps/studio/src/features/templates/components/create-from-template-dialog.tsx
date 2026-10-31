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
import { RiMagicLine, RiPaletteLine, RiSparklingLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useBrandKits } from '@/features/brand-kits/api';
import { useCreateCampaign } from '@/features/builder-lab/api';
import { brandFromKit } from '@/features/builder-lab/lib/brand';
import { campaignRoutes } from '@/features/builder-lab/lib/routes';
import type { CatalogTemplate } from '../data/mock-templates';

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

  const [name, setName] = useState('');
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

      onClose();
      router.push(campaignRoutes(orgId).edit(campaign.id));
    } catch {
      toast.error(t('createFailed'));
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="w-full max-w-md">
        <ModalHeader title={t('title')} description={t('subtitle')} />

        <ModalBody>
          <div className="flex flex-col gap-4 py-1">
            {/* Template Summary Card */}
            <div className="flex items-center gap-3 rounded-xl border border-border-card-default bg-background-tertiary-default/50 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background-primary-default border border-border-card-default text-text-primary">
                <RiSparklingLine className="size-5 text-accent-500" />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-body-2-semibold text-text-primary truncate">
                  {displayTemplate.name}
                </span>
                <span className="text-caption-1-regular text-text-tertiary truncate">
                  {displayTemplate.skinName} · {displayTemplate.playDuration}
                </span>
              </div>
            </div>

            {/* Campaign Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="campaign-name" className="text-caption-1-medium text-text-secondary">
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
            {create.isPending ? t('creating') : t('startDesigning')}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
