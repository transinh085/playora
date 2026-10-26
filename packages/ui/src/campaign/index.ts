/**
 * Campaign renderer (ADR-014): canvas screens, the game mechanisms and the player flow, shared by
 * the Studio (editor, Builder Lab) and Play. API-agnostic: hosts fetch data and pass it in.
 */
export {
  CampaignPlayer,
  type CampaignPlayerDocument,
  type CampaignPlayerHandle,
  type CampaignPlayerProps,
} from './campaign-player';
export { toCanvasPrizes } from './canvas-prizes';
export {
  type CanvasPrize,
  type CanvasRuntime,
  CanvasScreen,
  type CanvasVariable,
} from './canvas-screen';
export {
  EMPTY_FORM,
  isValidPhone,
  normalizePhone,
  type PlayerFormError,
  type PlayerFormErrors,
  type PlayerFormValues,
  validatePlayerForm,
} from './form-validation';
export {
  type CampaignMessageKey,
  type CampaignPlayerLabels,
  type CampaignTranslate,
  type CanvasLabels,
  createCampaignPlayerLabels,
  type FormatDateTime,
  type MechanismLabels,
} from './labels';
export { Mechanism, type MechanismProps } from './mechanism';
export * from './model';
export type { CampaignPlayerRules, PlayerVoucher } from './player-sheets';
export { useReducedMotion } from './use-play-round';
