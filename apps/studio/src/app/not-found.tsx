'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { RiArrowLeftLine, RiHome5Line } from '@remixicon/react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogoMark } from '@/components/logo';

export default function NotFound() {
  const t = useTranslations('notFoundPage');
  const router = useRouter();

  return (
    <main className="flex min-h-[75vh] w-full flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-6 flex items-center justify-center">
        {/* Ambient warm aura */}
        <div className="absolute size-36 rounded-full bg-linear-to-tr from-accent-500/20 via-brand-primary/15 to-amber-500/20 blur-2xl" />

        {/* Mascot hero pedestal card */}
        <div className="relative flex size-28 items-center justify-center rounded-3xl border border-border-button-default bg-linear-to-b from-background-primary-default to-background-secondary-default p-4 shadow-lg transition-transform duration-300 hover:scale-105">
          <LogoMark className="size-20 object-contain drop-shadow-sm" alt="Ora mascot" />
          <span className="absolute -bottom-2 -right-2 flex h-6 items-center justify-center rounded-full border border-background-primary-default bg-accent-600 px-2 text-caption-2-medium font-bold text-white shadow-xs">
            404
          </span>
        </div>
      </div>

      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-caption-1-medium text-accent-700 dark:border-accent-800/40 dark:bg-accent-950/40 dark:text-accent-300">
        <span>{t('badge')}</span>
      </div>

      <h1 className="m-0 mb-2 font-display text-display-3-bold text-text-primary">{t('title')}</h1>
      <p className="m-0 max-w-md text-body-medium text-text-secondary">{t('description')}</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href={'/' as Route}>
          <Button size="medium" variant="primary" leadingIcon={RiHome5Line}>
            {t('backHome')}
          </Button>
        </Link>
        <Button
          size="medium"
          variant="secondary"
          leadingIcon={RiArrowLeftLine}
          onClick={() => router.back()}
        >
          {t('backPrevious')}
        </Button>
      </div>
    </main>
  );
}
