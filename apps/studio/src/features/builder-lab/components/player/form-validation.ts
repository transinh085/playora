/** The Form screen's fields (docs/product/specs/builder.md §3.1 Identity/Form). Pure so it can be unit-tested. */
export interface PlayerFormValues {
  name: string;
  phone: string;
  consent: boolean;
}

export type PlayerFormError = 'nameRequired' | 'phoneInvalid' | 'consentRequired';
export type PlayerFormErrors = Partial<Record<keyof PlayerFormValues, PlayerFormError>>;

export const EMPTY_FORM: PlayerFormValues = { name: '', phone: '', consent: false };

/** Strips spaces, dots and dashes; `+84…` becomes `0…`. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s.-]/g, '').replace(/^\+84/, '0');
}

/** Vietnamese mobile numbers: 10 digits starting 03/05/07/08/09. */
export function isValidPhone(raw: string): boolean {
  return /^0[35789]\d{8}$/.test(normalizePhone(raw));
}

export function validatePlayerForm(values: PlayerFormValues): PlayerFormErrors {
  const errors: PlayerFormErrors = {};
  if (values.name.trim().length < 2) errors.name = 'nameRequired';
  if (!isValidPhone(values.phone)) errors.phone = 'phoneInvalid';
  if (!values.consent) errors.consent = 'consentRequired';
  return errors;
}
