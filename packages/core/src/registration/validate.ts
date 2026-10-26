import {
  type ConsentItem,
  ErrorCode,
  type JoinConsentEntry,
  type PublicConsentItem,
  type RegistrationField,
} from '@playora/contracts';
import { z } from 'zod';

export const NAME_FIELD_KEYS = new Set([
  'name',
  'fullname',
  'full_name',
  'displayname',
  'display_name',
  'ho_ten',
  'hoten',
]);

export const MAX_FORM_FIELD_VALUE_LENGTH = 500;
export const MAX_DISPLAY_NAME_LENGTH = 120;
export const DEFAULT_PLAYER_DISPLAY_NAME = 'Người chơi';
export const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

const EMAIL_SCHEMA = z.email();

export type ConsentsInput =
  | Record<string, boolean>
  | ReadonlyArray<JoinConsentEntry>
  | null
  | undefined;

export type RegistrationFieldLike = RegistrationField | z.input<typeof RegistrationField>;

export interface RegistrationFormLike {
  fields: readonly RegistrationFieldLike[];
  consents?: readonly Pick<ConsentItem | PublicConsentItem, 'purpose' | 'required'>[];
}

export interface RegistrationInput {
  fields?: Record<string, string | boolean | undefined> | null;
  consents?: ConsentsInput;
}

export interface RegistrationValidationError {
  field: string;
  code: typeof ErrorCode.VALIDATION_FAILED;
  message: string;
}

export type RegistrationValidationResult =
  | {
      ok: true;
      error: null;
      consentsMap: Map<string, boolean>;
      /** Non-sensitive answers only: `phone` fields are never put here (PDPL, security.md §3). */
      formData: Record<string, string | boolean>;
      /** The first non-empty `phone` field, as typed (trimmed); the API encrypts and hashes it. */
      phone: string | null;
    }
  | {
      ok: false;
      error: RegistrationValidationError;
      field: string;
      code: typeof ErrorCode.VALIDATION_FAILED;
      message: string;
      consentsMap: Map<string, boolean>;
      formData: Record<string, string | boolean>;
    };

export function normalizeConsentsInput(input?: ConsentsInput): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (!input) return map;
  if (Array.isArray(input)) {
    for (const item of input) {
      map.set(item.purpose, item.granted);
    }
  } else {
    for (const [purpose, granted] of Object.entries(input)) {
      map.set(purpose, granted);
    }
  }
  return map;
}

function fail(
  field: string,
  message: string,
  consentsMap: Map<string, boolean>,
  formData: Record<string, string | boolean>,
): RegistrationValidationResult {
  const error: RegistrationValidationError = {
    field,
    code: ErrorCode.VALIDATION_FAILED,
    message,
  };
  return {
    ok: false,
    error,
    field,
    code: ErrorCode.VALIDATION_FAILED,
    message,
    consentsMap,
    formData,
  };
}

/**
 * Browser-safe validation for event registration fields and consents.
 */
export function validateRegistration(
  form: RegistrationFormLike,
  input: RegistrationInput = {},
): RegistrationValidationResult {
  const consentsMap = normalizeConsentsInput(input.consents);
  const formData: Record<string, string | boolean> = {};
  let phone: string | null = null;

  for (const consent of form.consents ?? []) {
    const granted = consentsMap.get(consent.purpose) === true;
    if (consent.required && !granted) {
      return fail(
        `consents.${consent.purpose}`,
        'Vui lòng đồng ý với điều khoản bắt buộc',
        consentsMap,
        formData,
      );
    }
  }

  const fieldsRecord = input.fields ?? {};

  for (const field of form.fields) {
    const rawVal = fieldsRecord[field.key];
    if (field.type === 'checkbox') {
      if (field.required && rawVal !== true) {
        return fail(
          `fields.${field.key}`,
          `Trường "${field.label.vi}" là bắt buộc`,
          consentsMap,
          formData,
        );
      }
      if (typeof rawVal === 'boolean') {
        formData[field.key] = rawVal;
      }
      continue;
    }

    const strVal =
      typeof rawVal === 'string' ? rawVal.trim().slice(0, MAX_FORM_FIELD_VALUE_LENGTH) : '';
    if (field.required && strVal.length === 0) {
      return fail(
        `fields.${field.key}`,
        `Trường "${field.label.vi}" là bắt buộc`,
        consentsMap,
        formData,
      );
    }

    if (strVal.length > 0) {
      if (field.type === 'email' && !EMAIL_SCHEMA.safeParse(strVal).success) {
        return fail(`fields.${field.key}`, 'Email không hợp lệ', consentsMap, formData);
      }
      if (
        field.type === 'phone' &&
        (!PHONE_REGEX.test(strVal) || strVal.replace(/\D/g, '').length < 7)
      ) {
        return fail(`fields.${field.key}`, 'Số điện thoại không hợp lệ', consentsMap, formData);
      }
      if (field.type === 'select' && field.options?.length && !field.options.includes(strVal)) {
        return fail(`fields.${field.key}`, 'Lựa chọn không hợp lệ', consentsMap, formData);
      }
      if (field.type === 'phone') {
        // Kept out of formData (stored as players.phone_enc / phone_hash by the API).
        phone ??= strVal;
        continue;
      }
      formData[field.key] = strVal;
    }
  }

  return {
    ok: true,
    error: null,
    consentsMap,
    formData,
    phone,
  };
}

export const validateFormAndConsents = validateRegistration;

export function resolveDisplayNameFromFields(
  fields: Record<string, string | boolean> | undefined,
  formFields: readonly RegistrationFieldLike[],
): string | null {
  if (!fields) return null;
  for (const f of formFields) {
    if (NAME_FIELD_KEYS.has(f.key.toLowerCase())) {
      const val = fields[f.key];
      if (typeof val === 'string' && val.trim().length > 0) {
        return val.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
      }
    }
  }
  for (const f of formFields) {
    if (f.type === 'text') {
      const val = fields[f.key];
      if (typeof val === 'string' && val.trim().length > 0) {
        return val.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
      }
    }
  }
  return null;
}

export function resolveDisplayName(
  explicitName: string | undefined,
  fields: Record<string, string | boolean> | undefined,
  formFields: readonly RegistrationFieldLike[],
  fallback: string = DEFAULT_PLAYER_DISPLAY_NAME,
): string {
  const trimmed = explicitName?.trim();
  if (trimmed) return trimmed;
  return (
    resolveDisplayNameFromFields(fields, formFields) ?? (fallback || DEFAULT_PLAYER_DISPLAY_NAME)
  );
}

export function mergeRegistrationFormData(
  existing: unknown,
  incoming: Record<string, string | boolean>,
): { formData: Record<string, string | boolean>; changed: boolean } {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, string | boolean>)
      : {};
  const changed = Object.entries(incoming).some(([k, v]) => base[k] !== v);
  return {
    formData: { ...base, ...incoming },
    changed,
  };
}

export interface ReconcileExistingPlayerInput {
  existing: {
    displayName: string | null;
    team: string | null;
    checkedInAt: Date | null;
    deviceId: string | null;
    formData: unknown;
  };
  isGuestList: boolean;
  explicitDisplayName?: string;
  defaultDisplayName: string;
  guestTeam: string | null;
  deviceId: string;
  formData: Record<string, string | boolean>;
  formFields: readonly RegistrationFieldLike[];
  now: Date;
}

export interface ExistingPlayerPatch {
  displayName: string;
  team: string | null;
  checkedInAt: Date;
  deviceId: string;
  formData: Record<string, string | boolean>;
}

export function reconcileExistingPlayer(
  input: ReconcileExistingPlayerInput,
): ExistingPlayerPatch | null {
  const merged = mergeRegistrationFormData(input.existing.formData, input.formData);
  const displayName = input.isGuestList
    ? input.defaultDisplayName
    : resolveDisplayName(
        input.explicitDisplayName,
        input.formData,
        input.formFields,
        input.existing.displayName || input.defaultDisplayName,
      );
  const team = input.isGuestList ? input.guestTeam : input.existing.team;
  const needsUpdate =
    !input.existing.checkedInAt ||
    input.existing.displayName !== displayName ||
    input.existing.team !== team ||
    input.existing.deviceId !== input.deviceId ||
    merged.changed;

  if (!needsUpdate) return null;
  return {
    displayName,
    team,
    checkedInAt: input.existing.checkedInAt ?? input.now,
    deviceId: input.deviceId,
    formData: merged.formData,
  };
}

export interface ConsentRecordMeta {
  playerId: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface NewConsentRecord {
  playerId: string;
  purpose: string;
  granted: boolean;
  textVersion: string;
  textHash: string;
  ip: string | null;
  userAgent: string | null;
}

export function buildNewConsentRecords(
  consents: readonly PublicConsentItem[],
  consentsMap: ReadonlyMap<string, boolean>,
  existingPurposes: ReadonlySet<string>,
  meta: ConsentRecordMeta,
): NewConsentRecord[] {
  return consents
    .filter((c) => !existingPurposes.has(c.purpose))
    .map((c) => ({
      playerId: meta.playerId,
      purpose: c.purpose,
      granted: consentsMap.get(c.purpose) === true,
      textVersion: c.textVersion,
      textHash: c.textHash,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    }));
}
