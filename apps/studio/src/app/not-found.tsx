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
      <div className="mb-4 flex items-center justify-center">
        <LogoMark
          className="size-28 shrink-0 object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105 sm:size-32"
          alt="Playora"
        />
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
