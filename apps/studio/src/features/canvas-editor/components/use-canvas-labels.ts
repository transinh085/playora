'use client';

import { useTranslations } from 'next-intl';
import type { CanvasLabels } from './canvas-screen';

/** Translated runtime labels for `CanvasScreen` (countdown units, form fields, sample values). */
export function useCanvasLabels(): CanvasLabels {
  const t = useTranslations('canvasLab.render');
  return {
    days: t('days'),
    hours: t('hours'),
    minutes: t('minutes'),
    seconds: t('seconds'),
    remaining: (count) => t('remaining', { count }),
    fullName: t('fullName'),
    phone: t('phone'),
    consent: t('consent'),
    sampleName: t('sampleName'),
    samplePrize: t('samplePrize'),
    sampleEvent: t('sampleEvent'),
  };
}
