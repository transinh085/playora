import type {
  Campaign,
  CampaignBrand,
  CampaignPrize,
  CampaignRules,
  CampaignScreens,
  EventRegistrationForm,
} from '@playora/contracts';
import { normalizeRegistrationForm } from '@playora/core/registration';
import { getTemplate } from '@playora/templates/server';
import type { EventPatch } from './campaigns.repository';

/** What `games.draftConfig` and `game_versions.config` hold for a campaign (ADR-015). */
export interface CampaignDocument {
  brand: CampaignBrand;
  screens: CampaignScreens;
  prizes: CampaignPrize[];
  rules: CampaignRules;
}

export const DEFAULT_CAMPAIGN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** No plan limits in M1; per-plan caps arrive with billing (roadmap P2). */
export const CAMPAIGN_PLAYER_LIMIT = 1_000_000;

/** Used when a template is not in `@playora/templates` yet (scratch-card, gift-box). */
const FALLBACK_TEMPLATE_VERSION = '1.0.0';

export function templateVersionFor(templateKey: Campaign['templateKey']): string {
  return getTemplate(templateKey)?.version ?? FALLBACK_TEMPLATE_VERSION;
}

/**
 * Form shown when `rules.collectForm` is on (docs/business/compliance.md): name and phone, a
 * required consent for running the campaign and an optional, unticked marketing consent.
 * When `collectForm` is off the campaign is anonymous and collects no personal data, so it has
 * no form and no consent (`registrationForm = null`, identity `anonymous`).
 */
export const CAMPAIGN_REGISTRATION_FORM: EventRegistrationForm = {
  fields: [
    { key: 'name', type: 'text', label: { vi: 'Họ và tên', en: 'Full name' }, required: true },
    {
      key: 'phone',
      type: 'phone',
      label: { vi: 'Số điện thoại', en: 'Phone number' },
      required: true,
    },
  ],
  consents: [
    {
      purpose: 'participation',
      text: {
        vi: 'Tôi đồng ý để cửa hàng dùng họ tên và số điện thoại của tôi để ghi nhận lượt chơi và trao quà trong chương trình này.',
        en: 'I agree that the shop uses my name and phone number to record my plays and hand over prizes in this campaign.',
      },
      required: true,
    },
    {
      purpose: 'marketing',
      text: {
        vi: 'Tôi đồng ý nhận tin ưu đãi từ cửa hàng qua số điện thoại đã cung cấp.',
        en: 'I agree to receive offers from the shop at the phone number I provided.',
      },
      required: false,
    },
  ],
};

/** Event columns mirrored from a campaign document (schedule, identity, form, turn limits). */
export function eventMirror(doc: CampaignDocument): EventPatch {
  const { rules } = doc;
  return {
    startsAt: new Date(rules.startsAt),
    endsAt: new Date(rules.endsAt),
    identity: rules.collectForm ? 'form_only' : 'anonymous',
    registrationForm: rules.collectForm
      ? normalizeRegistrationForm(CAMPAIGN_REGISTRATION_FORM)
      : null,
    schedule: rules.openingHours
      ? [{ start: rules.openingHours.start, end: rules.openingHours.end }]
      : null,
    participation: {
      playsPerDay: rules.playsPerDay,
      maxWinsPerPlayer: rules.maxWinsPerPlayer,
    },
  };
}

const VI_SPECIAL: Record<string, string> = { đ: 'd', Đ: 'd' };
const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** `Khai trương Quán Đức` → `khai-truong-quan-duc-x7k2qa` (diacritics stripped, random suffix). */
export function generateSlug(name: string): string {
  const base = name
    .replace(/[đĐ]/g, (c) => VI_SPECIAL[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  let suffix = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) suffix += SLUG_ALPHABET[b % SLUG_ALPHABET.length];
  return base ? `${base}-${suffix}` : `ct-${suffix}`;
}
