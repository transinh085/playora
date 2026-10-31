import { useCallback, useMemo, useRef } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { z } from 'zod';

export interface FormInstance<Values = any> {
  getFieldsValue: (all?: true) => Values;
  setFields: (fields: Array<{ name: (string | number)[]; errors?: string[] }>) => void;
  setFieldsValue?: (values: Partial<Values>) => void;
  resetFields?: (fields?: (string | number)[]) => void;
}

export interface FormRule {
  validator?: (
    rule?: { field?: string | (string | number)[] } | object,
    value?: unknown,
  ) => Promise<void>;
  message?: string;
}

export interface FormValuesStore {
  getFieldsValue: (all?: true) => unknown;
}

export interface FormErrorTarget<Values = unknown> {
  setFields: (fields: Array<{ name: (string | number)[]; errors?: string[] }>) => void;
}

export type ZodValidatorRule = {
  validator: (
    rule?: { field?: string | (string | number)[] } | object,
    value?: unknown,
  ) => Promise<void>;
};

export type ZodFormRule = ((form: FormValuesStore) => ZodValidatorRule) & ZodValidatorRule;

/**
 * Converts a dot-delimited field path (`'consents.x'`, `'items.0.name'`, `'slug'`)
 * into a name path array (`['consents', 'x']`, `['items', 0, 'name']`, `['slug']`).
 */
export function toNamePath(field: string | readonly (string | number)[]): (string | number)[] {
  if (Array.isArray(field)) {
    return field.map((part) =>
      typeof part === 'string' && /^\d+$/.test(part) ? Number(part) : part,
    );
  }
  const str = String(field);
  if (!str) return [];
  return str.split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

function toDotPath(field: string | readonly PropertyKey[] | undefined): string {
  if (!field) return '';
  if (Array.isArray(field)) return field.map(String).join('.');
  return String(field);
}

function extractRuleField(
  rule: { field?: string | (string | number)[] } | object | undefined,
): string | (string | number)[] | undefined {
  if (!rule || typeof rule !== 'object' || !('field' in rule)) return undefined;
  const f = (rule as { field?: unknown }).field;
  if (typeof f === 'string' || Array.isArray(f)) {
    return f as string | (string | number)[];
  }
  return undefined;
}

function cloneStore(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  try {
    return structuredClone(input as Record<string, unknown>);
  } catch {
    return { ...(input as Record<string, unknown>) };
  }
}

function hasAtPath(obj: Record<string, unknown>, parts: (string | number)[]): boolean {
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return false;
    if (!(part in (cur as Record<PropertyKey, unknown>))) return false;
    cur = (cur as Record<PropertyKey, unknown>)[part];
  }
  return true;
}

function setAtPath(
  obj: Record<string, unknown>,
  parts: (string | number)[],
  value: unknown,
): Record<string, unknown> {
  if (parts.length === 0) return obj;
  let cur: Record<PropertyKey, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i] as string | number;
    const nextKey = parts[i + 1];
    const existing = cur[key];
    if (existing === null || existing === undefined || typeof existing !== 'object') {
      cur[key] = typeof nextKey === 'number' ? [] : {};
    } else if (Array.isArray(existing)) {
      cur[key] = [...existing];
    } else {
      cur[key] = { ...(existing as Record<string, unknown>) };
    }
    cur = cur[key] as Record<PropertyKey, unknown>;
  }
  const lastKey = parts[parts.length - 1] as string | number;
  cur[lastKey] = value;
  return obj;
}

function createValidator<S extends z.ZodType>(
  schema: S,
  form?: FormValuesStore,
): ZodValidatorRule['validator'] {
  return async function validateField(rule, value) {
    const fieldDotPath = toDotPath(extractRuleField(rule));
    const namePath = toNamePath(fieldDotPath);
    const rawValues = form ? form.getFieldsValue(true) : {};
    const candidate = cloneStore(rawValues);

    if (namePath.length > 0 && (value !== undefined || !hasAtPath(candidate, namePath))) {
      setAtPath(candidate, namePath, value);
    }

    const parsed = schema.safeParse(candidate);
    if (parsed.success) return;

    const issue = parsed.error.issues.find((iss) => toDotPath(iss.path) === fieldDotPath);
    if (issue) {
      throw new Error(issue.message);
    }
  };
}

/**
 * Form rule adapter backed by a Zod schema.
 */
export function zodRule<S extends z.ZodType>(schema: S, form?: FormValuesStore): ZodFormRule {
  const defaultValidator = createValidator(schema, form);
  const ruleRender = (ctxForm?: FormValuesStore): ZodValidatorRule => ({
    validator: createValidator(schema, form ?? ctxForm),
  });
  return Object.assign(ruleRender, { validator: defaultValidator });
}

export interface UseZodFormResult<S extends z.ZodType> {
  form: FormInstance<z.input<S>>;
  rules: FormRule[];
  parse: (values?: z.input<S>) => z.output<S>;
}

export function useZodForm<S extends z.ZodType>(
  schema: S,
  existingForm?: FormInstance<z.input<S>>,
): UseZodFormResult<S> {
  const storeRef = useRef<Record<string, unknown>>({});
  const form = useMemo<FormInstance<z.input<S>>>(
    () =>
      existingForm ?? {
        getFieldsValue: () => storeRef.current as z.input<S>,
        setFieldsValue: (val) => {
          Object.assign(storeRef.current, val);
        },
        resetFields: () => {
          storeRef.current = {};
        },
        setFields: () => {},
      },
    [existingForm],
  );

  const rules = useMemo<FormRule[]>(() => [zodRule(schema, form)], [schema, form]);

  const parse = useCallback(
    (values?: z.input<S>): z.output<S> => {
      const storeValues = form.getFieldsValue(true);
      const raw =
        values !== undefined &&
        typeof values === 'object' &&
        values !== null &&
        typeof storeValues === 'object' &&
        storeValues !== null
          ? { ...storeValues, ...values }
          : (values ?? storeValues);
      return schema.parse(raw);
    },
    [schema, form],
  );

  return { form, rules, parse };
}

interface ApiErrorDetailsShape {
  field?: string;
  fieldErrors?: Record<string, string[]>;
  body?: {
    fieldErrors?: Record<string, string[]>;
  };
}

/**
 * Maps an API error (`details.field` or `details.body.fieldErrors`) onto form fields
 * via `form.setFields`.
 */
export function applyApiError<Values = unknown, Code extends string = string>(
  form: FormErrorTarget<Values>,
  error: unknown,
  messageFor?: (code: Code) => string,
): boolean {
  if (!error || typeof error !== 'object') return false;

  const errObj = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  const details =
    errObj.details && typeof errObj.details === 'object'
      ? (errObj.details as ApiErrorDetailsShape)
      : undefined;

  if (!details) return false;

  if (typeof details.field === 'string' && details.field.trim().length > 0) {
    const code = (typeof errObj.code === 'string' ? errObj.code : 'INTERNAL') as Code;
    const message = messageFor
      ? messageFor(code)
      : typeof errObj.message === 'string' && errObj.message.length > 0
        ? errObj.message
        : code;

    form.setFields([
      {
        name: toNamePath(details.field),
        errors: [message],
      },
    ]);
    return true;
  }

  const fieldErrors = details.body?.fieldErrors ?? details.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const entries = Object.entries(fieldErrors).filter(
      ([field, messages]) =>
        field.trim().length > 0 && Array.isArray(messages) && messages.length > 0,
    );
    if (entries.length > 0) {
      form.setFields(
        entries.map(([field, messages]) => ({
          name: toNamePath(field),
          errors: messages,
        })),
      );
      return true;
    }
  }

  return false;
}

/**
 * Maps an API error (`details.field` or `details.body.fieldErrors`) onto React Hook Form fields
 * via `setError`.
 */
export function applyApiErrorToRHF<T extends FieldValues = FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  messageFor?: (code: any) => string,
): boolean {
  if (!error || typeof error !== 'object') return false;

  const errObj = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  const details =
    errObj.details && typeof errObj.details === 'object'
      ? (errObj.details as ApiErrorDetailsShape)
      : undefined;

  if (!details) return false;

  if (typeof details.field === 'string' && details.field.trim().length > 0) {
    const code = typeof errObj.code === 'string' ? errObj.code : 'INTERNAL';
    const message = messageFor
      ? messageFor(code)
      : typeof errObj.message === 'string' && errObj.message.length > 0
        ? errObj.message
        : code;

    setError(details.field as Path<T>, { message });
    return true;
  }

  const fieldErrors = details.body?.fieldErrors ?? details.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const entries = Object.entries(fieldErrors).filter(
      ([field, messages]) =>
        field.trim().length > 0 && Array.isArray(messages) && messages.length > 0,
    );
    if (entries.length > 0) {
      for (const [field, messages] of entries) {
        setError(field as Path<T>, { message: messages[0] });
      }
      return true;
    }
  }

  return false;
}
