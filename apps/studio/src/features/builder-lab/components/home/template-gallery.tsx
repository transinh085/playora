'use client';

import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@playora/ui/components/dialog';
import { Input } from '@playora/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { toast } from '@playora/ui/components/sonner';
import { Check, Sparkles } from '@playora/ui/icons';
import { cn } from '@playora/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Caption } from '@/components/caption';
import { useBrandKits } from '@/features/brand-kits/api';
import {
  type Occasion,
  type SkinInfo,
  type SkinKey,
  type TemplateKey,
  useCreateCampaign,
} from '../../api';
import { brandFromKit } from '../../lib/brand';
import { campaignRoutes } from '../../lib/routes';
import { buildScreens, TEMPLATES } from '../../lib/starter';
import { FitScreen } from '../editor/fit-screen';

const OCCASIONS: Occasion[] = ['tet', 'opening', 'everyday'];
const MECHANICS: TemplateKey[] = ['spin-wheel', 'scratch-card', 'gift-box'];

interface Choice {
  templateKey: TemplateKey;
  skin: SkinInfo;
}

/** "Create campaign": pick template × skin from live cover previews, name it, start editing. */
export function TemplateGallery({ orgId }: { orgId: string }) {
  const t = useTranslations('builderLab.home');
  const router = useRouter();
  const create = useCreateCampaign(orgId);
  const brandKits = useBrandKits(orgId);
  const [occasion, setOccasion] = useState<Occasion | 'all'>('all');
  const [mechanic, setMechanic] = useState<TemplateKey | 'all'>('all');
  const [picked, setPicked] = useState<{ templateKey: TemplateKey; skinKey: SkinKey } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedBrandKitId, setSelectedBrandKitId] = useState<string | undefined>(undefined);

  const choices = useMemo<Choice[]>(
    () => TEMPLATES.flatMap((tpl) => tpl.skins.map((skin) => ({ templateKey: tpl.key, skin }))),
    [],
  );
  const covers = useMemo(
    () =>
      new Map(
        choices.map((c) => [
          `${c.templateKey}:${c.skin.key}`,
          buildScreens(c.templateKey, c.skin.key).cover,
        ]),
      ),
    [choices],
  );

  const visible = choices.filter(
    (c) =>
      (occasion === 'all' || c.skin.occasion === occasion) &&
      (mechanic === 'all' || c.templateKey === mechanic),
  );

  const pick = (c: Choice, openModal = true) => {
    setPicked({ templateKey: c.templateKey, skinKey: c.skin.key });
    setName(
      t('defaultName', {
        template: t(`templates.${c.templateKey}`),
        skin: t(`skins.${c.skin.key}`),
      }),
    );
    if (brandKits.data?.items[0]?.id && !selectedBrandKitId) {
      setSelectedBrandKitId(brandKits.data.items[0].id);
    }
    if (openModal) {
      setModalOpen(true);
    }
  };

  const submit = async () => {
    if (!picked || !name.trim()) return;
    try {
      const chosenKit =
        brandKits.data?.items.find((k) => k.id === selectedBrandKitId) ?? brandKits.data?.items[0];
      const campaign = await create.mutateAsync({
        ...picked,
        name: name.trim(),
        brand: brandFromKit(chosenKit),
      });
      toast.success(t('created'));
      router.push(campaignRoutes(orgId).edit(campaign.id));
    } catch {
      toast.error(t('createFailed'));
    }
  };

  const activeChoice = picked
    ? choices.find((c) => c.templateKey === picked.templateKey && c.skin.key === picked.skinKey)
    : null;
  const activeCover = picked ? covers.get(`${picked.templateKey}:${picked.skinKey}`) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-neutral-900 dark:text-[#FAFAFA]">
          <Sparkles className="size-5 text-teal-600 dark:text-teal-400" />
          {t('create.title')}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-[#A3A3A3]">{t('create.hint')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500 dark:text-[#A3A3A3]">
            {t('mechanicsLabel')}:
          </span>
          <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100/70 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              className={cn(
                'rounded-md px-3 py-1 font-medium transition-all',
                mechanic === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#171717] dark:text-[#FAFAFA]'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:text-[#FAFAFA]',
              )}
              onClick={() => setMechanic('all')}
            >
              {t('occasions.all')}
            </button>
            {MECHANICS.map((key) => (
              <button
                key={key}
                type="button"
                className={cn(
                  'rounded-md px-3 py-1 font-medium transition-all',
                  mechanic === key
                    ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#171717] dark:text-[#FAFAFA]'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:text-[#FAFAFA]',
                )}
                onClick={() => setMechanic(key)}
              >
                {t(`templates.${key}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-neutral-500 dark:text-[#A3A3A3]">
            {t('occasionsLabel')}:
          </span>
          {(['all', ...OCCASIONS] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setOccasion(key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-all border',
                occasion === key
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-[#FAFAFA] dark:text-neutral-900 dark:border-[#FAFAFA] shadow-xs'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-white/10 dark:text-[#A3A3A3] dark:hover:border-white/20',
              )}
            >
              {key === 'all' ? t('occasions.all') : t(`occasions.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}
      >
        {visible.map((c) => {
          const key = `${c.templateKey}:${c.skin.key}`;
          const active = picked?.templateKey === c.templateKey && picked.skinKey === c.skin.key;
          const cover = covers.get(key);
          return (
            <button
              type="button"
              key={key}
              onClick={() => pick(c, true)}
              aria-pressed={active}
              aria-label={`${t(`templates.${c.templateKey}`)} · ${t(`skins.${c.skin.key}`)}`}
              data-testid={`template-${key}`}
              className={cn(
                'group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white text-left shadow-xs transition-all hover:border-neutral-400 hover:shadow-sm dark:bg-[#0A0A0A]',
                active
                  ? 'border-teal-600 ring-2 ring-teal-600/30 dark:border-teal-400'
                  : 'border-neutral-200 dark:border-white/10 dark:hover:border-white/25',
              )}
            >
              <div className="relative h-[230px] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                {cover && <FitScreen screen={cover} brand={c.skin.brand} />}
                <div className="absolute left-2.5 top-2.5">
                  <Badge variant="secondary" className="text-[10px] shadow-xs">
                    {t(`templates.${c.templateKey}`)}
                  </Badge>
                </div>
                {active && (
                  <span className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm dark:bg-teal-400 dark:text-neutral-900">
                    <Check className="size-3.5" />
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 p-3.5">
                <span className="truncate text-xs font-semibold text-neutral-900 dark:text-[#FAFAFA]">
                  {t(`skins.${c.skin.key}`)}
                </span>
                <p className="text-[11px] text-neutral-500 dark:text-[#A3A3A3] truncate">
                  {t(`templates.${c.templateKey}`)}
                </p>
                <span
                  className={cn(
                    'mt-1 inline-flex h-7 w-full items-center justify-center rounded-md px-3 text-xs font-medium transition-colors shadow-xs',
                    active
                      ? 'bg-teal-600 text-white dark:bg-teal-500'
                      : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-[#D4D4D4] dark:hover:bg-white/10',
                  )}
                >
                  {t('useTemplate')}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="min-w-0">
          <span className="block text-xs font-semibold text-neutral-900 dark:text-[#FAFAFA]">
            {picked
              ? `${t(`templates.${picked.templateKey}`)} · ${t(`skins.${picked.skinKey}`)}`
              : t('pickFirst')}
          </span>
          <Caption className="text-[11px]">{picked ? name : t('namePlaceholder')}</Caption>
        </div>
        <Button
          className="h-8 rounded-md text-xs font-medium shadow-xs"
          disabled={!picked}
          onClick={() => setModalOpen(true)}
        >
          {t('createButton')}
        </Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-lg border border-neutral-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{t('modalTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <p className="text-xs text-muted-foreground">{t('modalSubtitle')}</p>

            {activeChoice && activeCover && (
              <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="h-[90px] w-[60px] shrink-0 overflow-hidden rounded-md border border-neutral-200 shadow-xs dark:border-white/10">
                  <FitScreen screen={activeCover} brand={activeChoice.skin.brand} />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
                    {t(`templates.${activeChoice.templateKey}`)}
                  </span>
                  <Caption className="mb-1 block text-[11px]">
                    {t(`skins.${activeChoice.skin.key}`)}
                  </Caption>
                  <Badge variant="secondary" className="text-[10px]">
                    {t(`occasions.${activeChoice.skin.occasion}`)}
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-700 dark:text-[#D4D4D4]">
                {t('nameLabel')}
              </span>
              <Input
                aria-label={t('nameLabel')}
                placeholder={t('namePlaceholder')}
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                className="h-8 rounded-md text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-neutral-700 dark:text-[#D4D4D4]">
                {t('brandKitLabel')}
              </span>
              <Select value={selectedBrandKitId} onValueChange={setSelectedBrandKitId}>
                <SelectTrigger className="h-8 w-full rounded-md text-xs">
                  <SelectValue placeholder={t('defaultBrandKit')} />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  {(brandKits.data?.items ?? []).map((kit) => (
                    <SelectItem key={kit.id} value={kit.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3.5 shrink-0 rounded-full border border-neutral-200 dark:border-white/10"
                          style={{ background: kit.tokens.colors.primary }}
                        />
                        <span>{kit.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-md text-xs"
              onClick={() => setModalOpen(false)}
            >
              {t('back')}
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-md text-xs shadow-xs"
              disabled={!name.trim() || create.isPending}
              onClick={submit}
            >
              {t('createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
