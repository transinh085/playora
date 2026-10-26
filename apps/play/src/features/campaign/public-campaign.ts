import { ApiError } from '@playora/api-client';
import { type PublicCampaign, playsApi } from '@playora/contracts';
import { cache } from 'react';
import { api } from '@/lib/api';

/**
 * The published campaign for a slug, or null when there is none (unknown slug, invalid slug,
 * never published). Cached per request so metadata and the page share one fetch.
 */
export const getPublicCampaign = cache(async (slug: string): Promise<PublicCampaign | null> => {
  try {
    const campaign = await api.call(playsApi.campaign, { params: { slug } });
    return campaign.phase === 'draft' ? null : campaign;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
});
