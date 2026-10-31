'use client';

import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
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
import { cn } from '@playora/ui/lib/utils';
import { Check, Sparkles } from 'lucide-react';
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
    <>
      <Card className="rounded-2xl border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-4" />
            {t('create.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Caption>{t('create.hint')}</Caption>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t('mechanicsLabel')}:
              </span>
              <div className="inline-flex rounded-full border bg-muted/50 p-0.5 text-xs">
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-3 py-1 font-medium transition-all',
                    mechanic === 'all'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
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
                      'rounded-full px-3 py-1 font-medium transition-all',
                      mechanic === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => setMechanic(key)}
                  >
                    {t(`templates.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t('occasionsLabel')}:
              </span>
              {(['all', ...OCCASIONS] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOccasion(key)}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium transition-all border',
                    occasion === key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-foreground/30',
                  )}
                >
                  {key === 'all' ? t('occasions.all') : t(`occasions.${key}`)}
                </button>
              ))}
            </div>
          </div>

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
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
                    'group flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all hover:shadow-md',
                    active ? 'border-primary ring-2 ring-primary/40' : 'border-border',
                  )}
                >
                  <div className="relative h-[230px] overflow-hidden bg-muted">
                    {cover && <FitScreen screen={cover} brand={c.skin.brand} />}
                    <div className="absolute left-2.5 top-2.5">
                      <Badge variant="secondary" className="text-[10px] shadow-sm">
                        {t(`templates.${c.templateKey}`)}
                      </Badge>
                    </div>
                    {active && (
                      <span className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 p-3">
                    <span className="truncate text-sm font-semibold">
                      {t(`skins.${c.skin.key}`)}
                    </span>
                    <Caption>{t(`templates.${c.templateKey}`)}</Caption>
                    <span
                      className={cn(
                        'mt-1 inline-flex h-8 w-full items-center justify-center rounded-full px-3 text-xs font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      {t('useTemplate')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-4">
            <div className="min-w-0">
              <span className="block font-semibold">
                {picked
                  ? `${t(`templates.${picked.templateKey}`)} · ${t(`skins.${picked.skinKey}`)}`
                  : t('pickFirst')}
              </span>
              <Caption>{picked ? name : t('namePlaceholder')}</Caption>
            </div>
            <Button className="rounded-full" disabled={!picked} onClick={() => setModalOpen(true)}>
              {t('createButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('modalTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <p className="text-xs text-muted-foreground">{t('modalSubtitle')}</p>

            {activeChoice && activeCover && (
              <div className="flex items-center gap-4 rounded-xl border bg-muted/40 p-3">
                <div className="h-[90px] w-[60px] shrink-0 overflow-hidden rounded-lg shadow-sm">
                  <FitScreen screen={activeCover} brand={activeChoice.skin.brand} />
                </div>
                <div className="min-w-0">
                  <span className="block text-base font-semibold">
                    {t(`templates.${activeChoice.templateKey}`)}
                  </span>
                  <Caption className="mb-1 block">{t(`skins.${activeChoice.skin.key}`)}</Caption>
                  <Badge variant="secondary">{t(`occasions.${activeChoice.skin.occasion}`)}</Badge>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs font-semibold">{t('nameLabel')}</span>
              <Input
                aria-label={t('nameLabel')}
                placeholder={t('namePlaceholder')}
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold">{t('brandKitLabel')}</span>
              <Select value={selectedBrandKitId} onValueChange={setSelectedBrandKitId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('defaultBrandKit')} />
                </SelectTrigger>
                <SelectContent>
                  {(brandKits.data?.items ?? []).map((kit) => (
                    <SelectItem key={kit.id} value={kit.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3.5 shrink-0 rounded-full border"
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
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t('back')}
            </Button>
            <Button
              className="rounded-full"
              disabled={!name.trim() || create.isPending}
              onClick={submit}
            >
              {t('createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
