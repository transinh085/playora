'use client';

import { Alert, Button, Empty, Flex, QRCode, Segmented, Select, Skeleton, Typography } from 'antd';
import { ArrowLeft, Printer } from 'lucide-react';
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
        <Skeleton active paragraph={{ rows: 12 }} className="max-w-md" />
      </div>
    );
  }

  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Empty description={tc('notFound')} />
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
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <Link href={routes.share(campaign.id)}>
              <Button icon={<ArrowLeft className="size-4" />}>{t('print.back')}</Button>
            </Link>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <Flex align="center" gap={8}>
              <Typography.Text type="secondary" className="text-xs">
                {t('channels.title')}:
              </Typography.Text>
              <Select
                value={currentCh}
                onChange={(val) => updateQueryParams(val, currentFormat)}
                options={allChannels}
                style={{ width: 180 }}
              />
            </Flex>
          </Flex>

          <Flex align="center" gap={16}>
            <Segmented
              value={currentFormat}
              onChange={(val) => updateQueryParams(currentCh, val as PrintFormat)}
              options={[
                { label: t('print.standeeA5'), value: 'standee' },
                { label: t('print.tentCardA6'), value: 'tent' },
              ]}
            />
            <Button
              type="primary"
              icon={<Printer className="size-4" />}
              onClick={() => window.print()}
            >
              {t('print.printNow')}
            </Button>
          </Flex>
        </Flex>

        {isDraft && (
          <div className="mt-3">
            <Alert type="warning" showIcon message={t('print.draftNotice')} className="text-xs" />
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
        backgroundColor: brand.background || '#FFFFFF',
        color: brand.text || '#1F1F1F',
      }}
      data-testid="print-standee"
    >
      {/* Decorative top brand bar */}
      <div
        className="absolute top-0 left-0 h-2.5 w-full"
        style={{ backgroundColor: brand.primary || '#0F7C79' }}
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
          className="text-2xl font-extrabold leading-tight tracking-tight uppercase"
          style={{ color: brand.primary || '#0F7C79' }}
        >
          {campaignName}
        </h1>
        {promoText && (
          <p
            className="mt-1 max-w-[120mm] text-sm font-medium opacity-85"
            style={{ color: brand.text || '#1F1F1F' }}
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
            backgroundColor: `${brand.primary || '#0F7C79'}1A`,
            color: brand.primary || '#0F7C79',
          }}
        >
          {ctaText}
        </div>

        {/* QR Code Container */}
        <div
          className="rounded-2xl border-2 bg-white p-4 shadow-xs"
          style={{
            borderColor: `${brand.primary || '#0F7C79'}30`,
          }}
          data-testid="print-qr-code"
        >
          <QRCode value={playerLink} size={200} color={brand.text || '#000000'} bordered={false} />
        </div>

        <p className="mt-3 text-xs font-medium text-zinc-500">{instructionText}</p>

        {isDraft && (
          <p className="mt-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            ⚠️ {draftNoticeText}
          </p>
        )}
      </div>

      {/* Footer info */}
      <footer className="flex items-center justify-between border-t border-zinc-200/80 pt-2 text-[10px] text-zinc-400">
        <span className="font-mono">ch={channelKey}</span>
        <span>{poweredByText}</span>
      </footer>
    </article>
  );
}

/** Folded Tent Card A6 (two mirrored halves on A5 sheet, 148mm × 210mm) */
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
  return (
    <article
      className="print-sheet relative flex h-[210mm] w-[148mm] flex-col overflow-hidden bg-white text-zinc-900 shadow-xl"
      style={{
        backgroundColor: brand.background || '#FFFFFF',
        color: brand.text || '#1F1F1F',
      }}
      data-testid="print-tent"
    >
      {/* Top half (105mm): Mirrored 180° for folding */}
      <div
        className="flex h-[105mm] w-full flex-col justify-between p-5 text-center"
        style={{ transform: 'rotate(180deg)' }}
      >
        <TentCardFace
          campaignName={campaignName}
          logo={logo}
          promoText={promoText}
          brand={brand}
          playerLink={playerLink}
          channelKey={channelKey}
          isDraft={isDraft}
          ctaText={ctaText}
          instructionText={instructionText}
          poweredByText={poweredByText}
          draftNoticeText={draftNoticeText}
        />
      </div>

      {/* Middle fold crease line */}
      <div className="relative flex h-0 w-full items-center justify-center border-t border-dashed border-zinc-400">
        <span className="bg-white px-3 text-[9px] font-medium tracking-wider text-zinc-400 uppercase select-none">
          ✂ {foldHereText} ✂
        </span>
      </div>

      {/* Bottom half (105mm): Normal upright */}
      <div className="flex h-[105mm] w-full flex-col justify-between p-5 text-center">
        <TentCardFace
          campaignName={campaignName}
          logo={logo}
          promoText={promoText}
          brand={brand}
          playerLink={playerLink}
          channelKey={channelKey}
          isDraft={isDraft}
          ctaText={ctaText}
          instructionText={instructionText}
          poweredByText={poweredByText}
          draftNoticeText={draftNoticeText}
        />
      </div>
    </article>
  );
}

function TentCardFace({
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
    <div className="flex h-full flex-col justify-between">
      {/* Top logo & title */}
      <div>
        {logo ? (
          <div className="flex max-h-8 items-center justify-center">
            {/* biome-ignore lint/performance/noImgElement: dynamic user uploaded logo */}
            <img src={logo} alt="Shop Logo" className="max-h-8 max-w-[80px] object-contain" />
          </div>
        ) : (
          <div
            className="text-xs font-bold uppercase"
            style={{ color: brand.primary || '#0F7C79' }}
          >
            {campaignName}
          </div>
        )}
        {promoText && <p className="mt-0.5 text-[10px] opacity-80 line-clamp-1">{promoText}</p>}
      </div>

      {/* QR Code and CTA */}
      <div className="my-auto flex flex-col items-center">
        <div
          className="mb-1 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase"
          style={{
            backgroundColor: `${brand.primary || '#0F7C79'}1A`,
            color: brand.primary || '#0F7C79',
          }}
        >
          {ctaText}
        </div>
        <div
          className="rounded-lg border bg-white p-2 shadow-xs"
          style={{ borderColor: `${brand.primary || '#0F7C79'}30` }}
          data-testid="print-qr-code"
        >
          <QRCode value={playerLink} size={110} color={brand.text || '#000000'} bordered={false} />
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">{instructionText}</p>
        {isDraft && (
          <p className="mt-0.5 text-[8px] font-medium text-amber-700">{draftNoticeText}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between text-[8px] text-zinc-400">
        <span>ch={channelKey}</span>
        <span>{poweredByText}</span>
      </div>
    </div>
  );
}
