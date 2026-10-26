'use client';

import {
  type CampaignPlayerLabels,
  type CanvasLabels,
  createCampaignPlayerLabels,
  type MechanismLabels,
} from '@playora/ui/campaign';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo } from 'react';

/** Every label of the shared campaign renderer, from the `campaignPlayer` messages. */
export function useCampaignPlayerLabels(): CampaignPlayerLabels {
  const t = useTranslations('campaignPlayer');
  const format = useFormatter();
  return useMemo(
    () => createCampaignPlayerLabels(t, (value, options) => format.dateTime(value, options)),
    [t, format],
  );
}

/** Translated runtime labels for `CanvasScreen` (countdown units, form fields, sample values). */
export function useCanvasLabels(): CanvasLabels {
  return useCampaignPlayerLabels().canvas;
}

/** Translated labels for an idle or playing `Mechanism`. */
export function useMechanismLabels(): MechanismLabels {
  return useCampaignPlayerLabels().mechanism;
}
