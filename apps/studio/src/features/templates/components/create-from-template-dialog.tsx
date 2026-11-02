'use client';

import {
  Button,
  Card,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  toast,
} from '@playora/ui/components';
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
      const effectiveTemplateKey = displayTemplate.realTemplateKey;
      const effectiveSkinKey = displayTemplate.skinKey;

      const campaign = await create.mutateAsync({
        templateKey: effectiveTemplateKey,
        skinKey: effectiveSkinKey,
        name: name.trim(),
        brand: {
          ...displayTemplate.brand,
          ...brandFromKit(chosenKit),
        },
        brandKit: chosenKit,
      });

      toast.success(t('createdSuccess'));

      onClose();
      router.push(campaignRoutes(orgId).edit(campaign.id));
    } catch {
      toast.error(t('createFailed'));
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('title')}</Modal.Heading>
              <p className="mt-1 text-caption-1-regular text-text-secondary">{t('subtitle')}</p>
            </Modal.Header>

            <Modal.Body>
              <div className="flex flex-col gap-4 py-1">
                {/* Template Summary Card */}
                <Card variant="secondary" className="flex-row items-center gap-3 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-primary">
                    <RiSparklingLine className="size-5 text-accent-500" />
                  </div>

                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-body-2-semibold text-text-primary">
                      {displayTemplate.name}
                    </span>
                    <span className="truncate text-caption-1-regular text-text-tertiary">
                      {displayTemplate.skinName} · {displayTemplate.playDuration}
                    </span>
                  </div>
                </Card>

                {/* Campaign Name Input */}
                <TextField id="campaign-name" value={name} onChange={setName} autoFocus fullWidth>
                  <Label>{t('nameLabel')}</Label>
                  <Input placeholder={t('namePlaceholder')} />
                </TextField>

                {/* Brand Kit Selector */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <RiPaletteLine className="size-3.5" />
                    {t('brandKitLabel')}
                  </Label>
                  <Select
                    aria-label={t('brandKitLabel')}
                    placeholder={t('defaultBrandKit')}
                    selectedKey={selectedBrandKitId ?? null}
                    onSelectionChange={(key) => key !== null && setSelectedBrandKitId(String(key))}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {(brandKits.data?.items ?? []).map((kit) => (
                          <ListBox.Item key={kit.id} id={kit.id} textValue={kit.name}>
                            <div className="flex items-center gap-2">
                              <span
                                className="size-3.5 shrink-0 rounded-full border border-border"
                                style={{ background: kit.tokens.colors.primary }}
                              />
                              <span>{kit.name}</span>
                            </div>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" size="sm" onPress={onClose}>
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                isDisabled={!name.trim() || create.isPending}
                onPress={handleSubmit}
              >
                <RiMagicLine className="size-4" />
                {create.isPending ? t('creating') : t('startDesigning')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
