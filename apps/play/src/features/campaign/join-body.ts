import type { JoinEventBody, PublicRegistrationForm } from '@playora/contracts';
import { normalizePhone, type PlayerFormValues } from '@playora/ui/campaign';

/**
 * Maps the shared player form (name, phone, one consent box) onto the campaign's registration
 * form (`registrationForm` in the public campaign): the name goes to the `name` field (or the
 * first text field), the phone to the first phone field, and the consent box grants every
 * **required** consent, whose text the form shows. Optional consents (marketing) are never shown
 * by the shared form, so they are sent as not granted. Without form values (anonymous campaign)
 * the player joins with the device id only.
 */
export function toJoinBody(input: {
  deviceId: string;
  registrationForm: PublicRegistrationForm;
  form: PlayerFormValues | null;
}): JoinEventBody {
  const { deviceId, registrationForm, form } = input;
  if (!form) return { deviceId };

  const { fields, consents } = registrationForm;
  const nameKey = (fields.find((f) => f.key === 'name') ?? fields.find((f) => f.type === 'text'))
    ?.key;
  const phoneKey = (fields.find((f) => f.type === 'phone') ?? fields.find((f) => f.key === 'phone'))
    ?.key;

  const name = form.name.trim();
  const values: Record<string, string | boolean> = {};
  for (const field of fields) {
    if (field.key === nameKey) values[field.key] = name;
    else if (field.key === phoneKey) values[field.key] = normalizePhone(form.phone);
    else if (field.type === 'checkbox') values[field.key] = false;
  }

  const granted: Record<string, boolean> = {};
  for (const consent of consents) granted[consent.purpose] = consent.required && form.consent;

  return {
    deviceId,
    ...(name ? { displayName: name } : {}),
    ...(fields.length > 0 ? { fields: values } : {}),
    ...(consents.length > 0 ? { consents: granted } : {}),
  };
}
