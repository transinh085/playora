import { createHash } from 'node:crypto';
import {
  type ConsentItem,
  EventRegistrationForm,
  type LocalizedCopy,
  type PublicConsentItem,
  type PublicRegistrationForm,
  type RegistrationField,
} from '@playora/contracts';
import type { z } from 'zod';

export type ConsentItemInput = ConsentItem | z.input<typeof ConsentItem>;
export type EventRegistrationFormInput =
  | EventRegistrationForm
  | z.input<typeof EventRegistrationForm>;

export function versionConsentItem(item: ConsentItemInput): PublicConsentItem {
  const payload = item.text.en ? `${item.text.vi}\n${item.text.en}` : item.text.vi;
  const textHash = createHash('sha256').update(payload).digest('hex');
  const textVersion = `sha256:${textHash.slice(0, 12)}`;
  return {
    purpose: item.purpose,
    text: item.text as LocalizedCopy,
    required: item.required ?? true,
    textVersion,
    textHash,
  };
}

export function normalizeRegistrationForm(
  form: EventRegistrationFormInput,
): PublicRegistrationForm {
  return {
    fields: (form.fields ?? []) as RegistrationField[],
    consents: (form.consents ?? []).map(versionConsentItem),
  };
}

export function parseRegistrationForm(raw: unknown): PublicRegistrationForm {
  if (!raw) return { fields: [], consents: [] };
  const parsed = EventRegistrationForm.safeParse(raw);
  if (!parsed.success) return { fields: [], consents: [] };
  return normalizeRegistrationForm(parsed.data);
}
