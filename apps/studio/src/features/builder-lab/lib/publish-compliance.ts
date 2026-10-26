import type { PromotionType } from '@playora/contracts';

export interface PublishChecklistState {
  promotionType: PromotionType | null;
  ackOrganizer: boolean;
  ackDepartment: boolean;
  ackTerms: boolean;
}

/**
 * Pre-publish legal checklist (CMP-03, docs/business/compliance.md §4).
 * All campaigns require confirming organizer responsibility and reviewing terms.
 * Purchase-linked campaigns additionally require confirming notification to the Department of Industry and Trade.
 */
export function isChecklistComplete(state: PublishChecklistState): boolean {
  if (!state.promotionType) return false;
  if (!state.ackOrganizer || !state.ackTerms) return false;
  if (state.promotionType === 'purchase_linked' && !state.ackDepartment) return false;
  return true;
}

export function canPublishCampaign(params: {
  blocking: boolean;
  checklist: PublishChecklistState;
}): boolean {
  return !params.blocking && isChecklistComplete(params.checklist);
}
