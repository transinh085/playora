'use client';

import { Alert, AlertTitle } from '@playora/ui/components/alert';
import { Button } from '@playora/ui/components/button';
import { QRCodeSvg } from '@playora/ui/components/qr-code';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { Skeleton } from '@playora/ui/components/skeleton';
import { AlertTriangle, ArrowLeft, Printer } from '@playora/ui/icons';
import { cn } from '@playora/ui/lib/utils';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { PLAY_URL } from '@/lib/env';
import { useCampaign } from '../../api';
import {
  buildPlayerLink,
  type CustomChannel,
  loadCustomChannels,
  PRESET_CHANNELS,
} from '../../lib/channels';
import { campaignRoutes } from '../../lib/routes';
import { readSlot } from '../quick-edit/slots';

export type PrintFormat = 'standee' | 'tent';

export function CampaignSharePrint({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const t = useTranslations('campaigns.share');
  const tc = useTranslations('campaigns');
  const router = useRouter();
  const searchParams = useSearchParams();
  const routes = campaignRoutes(orgId);

  const rawCh = searchParams.get('ch');
  const rawFormat = searchParams.get('format') as PrintFormat | null;

  const currentCh = rawCh || 'table-qr';
  const currentFormat: PrintFormat = rawFormat === 'tent' ? 'tent' : 'standee';

  const campaignQuery = useCampaign(orgId, campaignId);
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>([]);

  useEffect(() => {
    if (campaignQuery.data?.id) {
      setCustomChannels(loadCustomChannels(campaignQuery.data.id));
    }
  }, [campaignQuery.data?.id]);

  if (campaignQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-96 w-full max-w-md rounded-lg" />
      </div>
    );
  }

  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-muted-foreground">
        {tc('notFound')}
      </div>
    );
  }

  const campaign = campaignQuery.data;
  const isDraft = campaign.status === 'draft';
  const playerLink = buildPlayerLink(PLAY_URL, campaign.slug, currentCh);

  const logo = readSlot(campaign.screens, 'logo');
  const promoText = readSlot(campaign.screens, 'promoText');
  const brand = campaign.brand;

  const allChannels = [
    ...PRESET_CHANNELS.map((p) => ({
      value: p.key,
      label: t(p.labelKey as never),
    })),
    ...customChannels.map((c) => ({
      value: c.key,
      label: c.label,
    })),
  ];

  const updateQueryParams = (newCh: string, newFormat: PrintFormat) => {
    const params = new URLSearchParams();
    params.set('ch', newCh);
    params.set('format', newFormat);
    router.replace(`?${params.toString()}` as never);
  };

  return (
    <div className="relative min-h-screen bg-zinc-100 font-sans text-zinc-900 antialiased dark:bg-zinc-900 dark:text-zinc-100">
      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: 148mm 210mm;
            margin: 0;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            width: 148mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Screen Toolbar (hidden in print) */}
      <header className="no-print sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-6 py-3 shadow-xs backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={routes.share(campaign.id)}>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="size-4" />
                {t('print.back')}
              </Button>
            </Link>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('channels.title')}:</span>
              <Select
                value={currentCh}
                onValueChange={(val) => updateQueryParams(val, currentFormat)}
              >
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allChannels.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100/70 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                className={cn(
                  'rounded-md px-3 py-1 font-medium transition-all',
                  currentFormat === 'standee'
                    ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#171717] dark:text-[#FAFAFA]'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:text-[#FAFAFA]',
                )}
                onClick={() => updateQueryParams(currentCh, 'standee')}
              >
                {t('print.standeeA5')}
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-md px-3 py-1 font-medium transition-all',
                  currentFormat === 'tent'
                    ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#171717] dark:text-[#FAFAFA]'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:text-[#FAFAFA]',
                )}
                onClick={() => updateQueryParams(currentCh, 'tent')}
              >
                {t('print.tentCardA6')}
              </button>
            </div>

            <Button
              className="gap-2 rounded-md h-8 text-xs shadow-xs"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="size-3.5" />
              {t('print.printNow')}
            </Button>
          </div>
        </div>

        {isDraft && (
          <div className="mt-3">
            <Alert className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs">{t('print.draftNotice')}</AlertTitle>
            </Alert>
          </div>
        )}
      </header>

      {/* Printable Sheet Viewport */}
      <main className="flex justify-center p-6 md:p-10">
        {currentFormat === 'standee' ? (
          <StandeeA5Sheet
            campaignName={campaign.name}
            logo={logo}
            promoText={promoText}
            brand={brand}
            playerLink={playerLink}
            channelKey={currentCh}
            isDraft={isDraft}
            ctaText={t('print.cta')}
            instructionText={t('print.instruction')}
            poweredByText={t('print.poweredBy')}
            draftNoticeText={t('print.draftNotice')}
          />
        ) : (
          <FoldedTentCardA6Sheet
            campaignName={campaign.name}
            logo={logo}
            promoText={promoText}
            brand={brand}
            playerLink={playerLink}
            channelKey={currentCh}
            isDraft={isDraft}
            ctaText={t('print.cta')}
            instructionText={t('print.instruction')}
            foldHereText={t('print.foldHere')}
            poweredByText={t('print.poweredBy')}
            draftNoticeText={t('print.draftNotice')}
          />
        )}
      </main>
    </div>
  );
}

/** Standee A5 (148mm × 210mm) portrait print template */
function StandeeA5Sheet({
  campaignName,
  logo,
  promoText,
  brand,
  playerLink,
  channelKey,
  isDraft,
  ctaText,
  instructionText,
  poweredByText,
  draftNoticeText,
}: {
  campaignName: string;
  logo?: string;
  promoText?: string;
  brand: {
    primary: string;
    text: string;
    background: string;
    surface: string;
  };
  playerLink: string;
  channelKey: string;
  isDraft: boolean;
  ctaText: string;
  instructionText: string;
  poweredByText: string;
  draftNoticeText: string;
}) {
  return (
    <article
      className="print-sheet relative flex h-[210mm] w-[148mm] flex-col justify-between overflow-hidden bg-white p-7 text-zinc-900 shadow-xl"
      style={{
        backgroundColor: brand.background,
        color: brand.text,
      }}
      data-testid="print-standee"
    >
      {/* Decorative top brand bar */}
      <div
        className="absolute left-0 top-0 h-2.5 w-full"
        style={{ backgroundColor: brand.primary }}
      />

      {/* Header section: Logo & Titles */}
      <div className="flex flex-col items-center pt-2 text-center">
        {logo && (
          <div className="mb-3 flex max-h-14 items-center justify-center">
            {/* biome-ignore lint/performance/noImgElement: dynamic user uploaded logo */}
            <img src={logo} alt="Shop Logo" className="max-h-14 max-w-[120px] object-contain" />
          </div>
        )}
        <h1
          className="text-2xl font-extrabold uppercase leading-tight tracking-tight"
          style={{ color: brand.primary }}
        >
          {campaignName}
        </h1>
        {promoText && (
          <p
            className="mt-1 max-w-[120mm] text-sm font-medium opacity-85"
            style={{ color: brand.text }}
          >
            {promoText}
          </p>
        )}
      </div>

      {/* QR Section */}
      <div className="my-auto flex flex-col items-center text-center">
        {/* Call to action badge */}
        <div
          className="mb-4 inline-block rounded-full px-5 py-1.5 text-sm font-bold uppercase tracking-wide"
          style={{
            backgroundColor: `${brand.primary}1A`,
            color: brand.primary,
          }}
        >
          {ctaText}
        </div>

        {/* QR Code Container */}
        <div
          className="rounded-2xl border-2 bg-white p-4 shadow-xs"
          style={{
            borderColor: `${brand.primary}30`,
          }}
          data-testid="print-qr-code"
        >
          <QRCodeSvg value={playerLink} size={200} color={brand.text} />
        </div>

        <p className="mt-3 text-xs font-medium text-zinc-500">{instructionText}</p>

        {isDraft && (
          <p className="mt-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            ⚠️ {draftNoticeText}
          </p>
        )}
      </div>

      {/* Footer branding */}
      <footer className="flex items-center justify-between border-t border-zinc-200/60 pt-3 text-[10px] text-zinc-400">
        <span className="font-mono">{channelKey}</span>
        <span>{poweredByText}</span>
      </footer>
    </article>
  );
}

/** Folded Table Tent A6 (A5 sheet landscape: two A6 faces side-by-side or stacked) */
function FoldedTentCardA6Sheet({
  campaignName,
  logo,
  promoText,
  brand,
  playerLink,
  channelKey,
  isDraft,
  ctaText,
  instructionText,
  foldHereText,
  poweredByText,
  draftNoticeText,
}: {
  campaignName: string;
  logo?: string;
  promoText?: string;
  brand: {
    primary: string;
    text: string;
    background: string;
    surface: string;
  };
  playerLink: string;
  channelKey: string;
  isDraft: boolean;
  ctaText: string;
  instructionText: string;
  foldHereText: string;
  poweredByText: string;
  draftNoticeText: string;
}) {
  const renderTentFace = (upsideDown = false) => (
    <div
      className={cn(
        'relative flex h-[105mm] w-[148mm] flex-col justify-between overflow-hidden p-5',
        upsideDown && 'rotate-180',
      )}
      style={{
        backgroundColor: brand.background,
        color: brand.text,
      }}
    >
      <div
        className="absolute left-0 top-0 h-1.5 w-full"
        style={{ backgroundColor: brand.primary }}
      />

      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="min-w-0">
          <h2
            className="truncate text-lg font-extrabold uppercase tracking-tight"
            style={{ color: brand.primary }}
          >
            {campaignName}
          </h2>
          {promoText && (
            <p className="truncate text-xs font-medium opacity-85" style={{ color: brand.text }}>
              {promoText}
            </p>
          )}
        </div>
        {logo && (
          <div className="flex max-h-8 shrink-0 items-center justify-end">
            {/* biome-ignore lint/performance/noImgElement: dynamic user uploaded logo */}
            <img src={logo} alt="Shop Logo" className="max-h-8 max-w-[70px] object-contain" />
          </div>
        )}
      </div>

      <div className="my-auto flex items-center justify-center gap-5">
        <div
          className="rounded-xl border bg-white p-2.5 shadow-xs"
          style={{ borderColor: `${brand.primary}30` }}
        >
          <QRCodeSvg value={playerLink} size={110} color={brand.text} />
        </div>
        <div className="flex flex-col items-start gap-1">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
            style={{
              backgroundColor: `${brand.primary}1A`,
              color: brand.primary,
            }}
          >
            {ctaText}
          </span>
          <span className="text-[11px] font-medium text-zinc-500">{instructionText}</span>
          {isDraft && (
            <span className="mt-1 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
              ⚠️ {draftNoticeText}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-200/50 pt-1.5 text-[9px] text-zinc-400">
        <span className="font-mono">{channelKey}</span>
        <span>{poweredByText}</span>
      </div>
    </div>
  );

  return (
    <article
      className="print-sheet relative flex h-[210mm] w-[148mm] flex-col overflow-hidden bg-white shadow-xl"
      data-testid="print-tent"
    >
      {renderTentFace(true)}
      <div className="relative flex h-0 w-full items-center justify-center border-t-2 border-dashed border-zinc-300">
        <span className="absolute rounded-full bg-zinc-200 px-2 py-0.5 text-[8px] font-semibold tracking-wider text-zinc-600 uppercase">
          ✂️ {foldHereText}
        </span>
      </div>
      {renderTentFace(false)}
    </article>
  );
}
