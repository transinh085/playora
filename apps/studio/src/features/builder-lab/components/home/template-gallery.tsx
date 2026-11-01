'use client';

import type { BrandKitSummary } from '@playora/contracts';
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  ListBox,
  Modal,
  SearchField,
  Select,
  Tabs,
  toast,
} from '@playora/ui/components';
import { ArrowLeft, Plus, Sparkles } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { useBrandKits } from '@/features/brand-kits/api';
import { useCreateCampaign } from '../../api';
import { brandFromKit } from '../../lib/brand';
import { campaignRoutes } from '../../lib/routes';
import {
  buildScreens,
  defaultPrizes,
  defaultRules,
  getSkin,
  type Occasion,
  type SkinInfo,
  type SkinKey,
  TEMPLATES,
  type TemplateKey,
} from '../../lib/starter';
import { FitScreen } from '../editor/fit-screen';

const OCCASIONS: readonly ('all' | Occasion)[] = ['all', 'tet', 'opening', 'everyday'];
const MECHANICS: readonly ('all' | TemplateKey)[] = [
  'all',
  'spin-wheel',
  'scratch-card',
  'gift-box',
];

const DEFAULT_BRAND_KIT_ID = '__default__';

export function TemplateGallery({ orgId, onBack }: { orgId: string; onBack?: () => void }) {
  const t = useTranslations('builderLab.home');
  const tp = useTranslations('builderLab.playbooks');
  const router = useRouter();
  const create = useCreateCampaign(orgId);
  const brandKitsQuery = useBrandKits(orgId);
  const brandKits: BrandKitSummary[] = brandKitsQuery.data?.items ?? [];

  const [occasion, setOccasion] = useState<'all' | Occasion>('all');
  const [mechanic, setMechanic] = useState<'all' | TemplateKey>('all');
  const [search, setSearch] = useState('');

  const [picked, setPicked] = useState<{ templateKey: TemplateKey; skinKey: SkinKey } | null>(null);
  const [name, setName] = useState('');
  const [selectedBrandKitId, setSelectedBrandKitId] = useState<string>(DEFAULT_BRAND_KIT_ID);

  const allSkins: SkinInfo[] = TEMPLATES[0]?.skins ?? [];
  const visibleSkins: SkinInfo[] =
    occasion === 'all' ? allSkins : allSkins.filter((skin) => skin.occasion === occasion);
  const visibleTemplates =
    mechanic === 'all' ? TEMPLATES : TEMPLATES.filter((tpl) => tpl.key === mechanic);
  const normalizedSearch = search.trim().toLowerCase();

  const pickCard = (templateKey: TemplateKey, skinKey: SkinKey) => {
    setPicked({ templateKey, skinKey });
    setName(
      t('defaultName', {
        template: t(`templates.${templateKey}`),
        skin: t(`skins.${skinKey}`),
      }),
    );
    if (brandKits.length > 0 && selectedBrandKitId === DEFAULT_BRAND_KIT_ID && brandKits[0]) {
      setSelectedBrandKitId(brandKits[0].id);
    }
  };

  const closeModal = () => {
    setPicked(null);
  };

  const handleCreate = async () => {
    if (!picked) return;
    const chosenKit =
      selectedBrandKitId === DEFAULT_BRAND_KIT_ID
        ? undefined
        : brandKits.find((k) => k.id === selectedBrandKitId);

    try {
      const campaign = await create.mutateAsync({
        name:
          name.trim() ||
          t('defaultName', {
            template: t(`templates.${picked.templateKey}`),
            skin: t(`skins.${picked.skinKey}`),
          }),
        templateKey: picked.templateKey,
        skinKey: picked.skinKey,
        brand: brandFromKit(chosenKit),
        brandKit: chosenKit,
      });
      toast.success(t('created'));
      setPicked(null);
      router.push(campaignRoutes(orgId).edit(campaign.id));
    } catch {
      toast.error(t('createFailed'));
    }
  };

  const previewPrizes = defaultPrizes().map((p) => ({
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    remaining: p.quantity,
    image: p.image,
  }));

  const defaultPlaysPerDay = defaultRules().playsPerDay;

  return (
    <div className="flex flex-col gap-5">
      {onBack && (
        <div>
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
            {tp('backToGoals')}
          </Button>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="flex flex-row flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-caption-1-semibold uppercase tracking-wider text-text-secondary">
            {t('occasionsLabel')}:
          </span>
          <Tabs
            selectedKey={occasion}
            onSelectionChange={(key) => setOccasion(key as 'all' | Occasion)}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label={t('occasionsLabel')}>
                {OCCASIONS.map((item) => (
                  <Tabs.Tab key={item} id={item} className="px-3 py-1 text-caption-1-medium">
                    {t(`occasions.${item}`)}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-caption-1-semibold uppercase tracking-wider text-text-secondary">
            {t('mechanicsLabel')}:
          </span>
          <Tabs
            selectedKey={mechanic}
            onSelectionChange={(key) => setMechanic(key as 'all' | TemplateKey)}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label={t('mechanicsLabel')}>
                {MECHANICS.map((item) => (
                  <Tabs.Tab key={item} id={item} className="px-3 py-1 text-caption-1-medium">
                    {item === 'all' ? t('occasions.all') : t(`templates.${item}`)}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          <SearchField
            value={search}
            onChange={setSearch}
            aria-label={t('nameLabel')}
            className="w-48"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('namePlaceholder')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
      </Card>

      {/* Template Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTemplates.map((template) =>
          visibleSkins
            .filter((skin) => {
              if (!normalizedSearch) return true;
              const tplTitle = t(`templates.${template.key}`).toLowerCase();
              const skinTitle = t(`skins.${skin.key}`).toLowerCase();
              return tplTitle.includes(normalizedSearch) || skinTitle.includes(normalizedSearch);
            })
            .map((skin) => {
              const key = `${template.key}:${skin.key}`;
              const selected = picked?.templateKey === template.key && picked?.skinKey === skin.key;
              const screens = buildScreens(template.key, skin.key);
              const cardLabel = `${t(`templates.${template.key}`)} · ${t(`skins.${skin.key}`)}`;
              const selectedKit =
                selectedBrandKitId === DEFAULT_BRAND_KIT_ID
                  ? undefined
                  : brandKits.find((k) => k.id === selectedBrandKitId);
              const previewBrand = { ...skin.brand, ...brandFromKit(selectedKit) };

              return (
                <Card
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => pickCard(template.key, skin.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      pickCard(template.key, skin.key);
                    }
                  }}
                  aria-label={cardLabel}
                  aria-pressed={selected}
                  className={cx(
                    'group relative flex cursor-pointer flex-col overflow-hidden p-0 text-left transition-all duration-200 hover:border-border-card-hover hover:shadow-dropdown',
                    selected
                      ? 'border-accent-500 ring-2 ring-accent-500/20'
                      : 'border-border-button-default',
                  )}
                >
                  {/* Preview Cover */}
                  <div className="relative h-64 w-full overflow-hidden border-b border-separator-border bg-background-secondary-default">
                    <FitScreen screen={screens.cover} brand={previewBrand} prizes={previewPrizes} />
                    <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <Chip variant="soft" color="default">
                        {t(`occasions.${skin.occasion}`)}
                      </Chip>
                    </div>
                  </div>

                  {/* Card Body */}
                  <Card.Content className="flex w-full flex-1 flex-col justify-between gap-4 p-5">
                    <div>
                      <Card.Title className="m-0 text-body-semibold text-text-primary">
                        {t(`templates.${template.key}`)}
                      </Card.Title>
                      <div className="mt-1 flex items-center justify-between">
                        <Caption>{t(`skins.${skin.key}`)}</Caption>
                        <span className="text-caption-2-medium text-text-tertiary">
                          {defaultPlaysPerDay} lượt/ngày
                        </span>
                      </div>
                    </div>

                    <Card.Footer className="p-0">
                      <span className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2 py-1.5 text-body-medium text-text-primary shadow-xs transition-colors group-hover:border-border-button-hover group-hover:bg-background-primary-hover">
                        <Sparkles className="size-[18px] shrink-0" aria-hidden />
                        <span>{t('useTemplate')}</span>
                      </span>
                    </Card.Footer>
                  </Card.Content>
                </Card>
              );
            }),
        )}
      </div>

      {/* Setup Modal */}
      <Modal
        isOpen={picked !== null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <Modal.Backdrop isDismissable>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('modalTitle')}</Modal.Heading>
                <p className="mt-1 text-body-2-regular text-text-secondary">{t('modalSubtitle')}</p>
              </Modal.Header>

              {picked && (
                <Modal.Body className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-separator-border bg-background-secondary-default/50 p-3.5">
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-xl border border-border-button-default">
                      <FitScreen
                        screen={buildScreens(picked.templateKey, picked.skinKey).cover}
                        brand={{
                          ...getSkin(picked.skinKey).brand,
                          ...brandFromKit(
                            selectedBrandKitId === DEFAULT_BRAND_KIT_ID
                              ? undefined
                              : brandKits.find((k) => k.id === selectedBrandKitId),
                          ),
                        }}
                        prizes={previewPrizes}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-body-medium text-text-primary">
                        {t(`templates.${picked.templateKey}`)}
                      </p>
                      <Caption>
                        {t(`skins.${picked.skinKey}`)} ·{' '}
                        {t(`occasions.${getSkin(picked.skinKey).occasion}`)}
                      </Caption>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="campaign-name-input">{t('nameLabel')}</Label>
                    <Input
                      id="campaign-name-input"
                      aria-label={t('nameLabel')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('namePlaceholder')}
                      fullWidth
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !create.isPending) {
                          handleCreate();
                        }
                      }}
                    />
                  </div>

                  {brandKits.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <Label>{t('brandKitLabel')}</Label>
                      <Select
                        aria-label={t('brandKitLabel')}
                        selectedKey={selectedBrandKitId}
                        onSelectionChange={(key) => {
                          if (key) setSelectedBrandKitId(String(key));
                        }}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item
                              id={DEFAULT_BRAND_KIT_ID}
                              textValue={t('defaultBrandKit')}
                            >
                              {t('defaultBrandKit')}
                            </ListBox.Item>
                            {brandKits.map((kit) => (
                              <ListBox.Item key={kit.id} id={kit.id} textValue={kit.name}>
                                {kit.name}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                  )}
                </Modal.Body>
              )}

              <Modal.Footer>
                <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
                  Huỷ
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isDisabled={!picked || create.isPending}
                  onClick={handleCreate}
                >
                  <Plus className="size-4" />
                  {t('createButton')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
