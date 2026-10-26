'use client';

import { localize, type PublicRegistrationForm } from '@playora/contracts';
import { type CampaignPlayerLabels, createCampaignPlayerLabels } from '@playora/ui/campaign';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

/**
 * Labels of the shared renderer from the `campaignPlayer` messages. With a registration form, the
 * form's consent box shows the campaign's own required consent text (that is what ticking it grants).
 */
export function useCampaignPlayerLabels(
  registrationForm?: PublicRegistrationForm,
): CampaignPlayerLabels {
  const t = useTranslations('campaignPlayer');
  const format = useFormatter();
  const locale = useLocale();
  return useMemo(() => {
    const labels = createCampaignPlayerLabels(t, (value, options) =>
      format.dateTime(value, options),
    );
    const required = registrationForm?.consents.filter((c) => c.required) ?? [];
    if (required.length === 0) return labels;
    const consent = required.map((c) => localize(c.text, locale)).join(' ');
    return { ...labels, canvas: { ...labels.canvas, consent } };
  }, [t, format, locale, registrationForm]);
}
