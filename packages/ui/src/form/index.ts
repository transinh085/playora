import { Form, type FormInstance, type FormRule } from 'antd';
import { useCallback, useMemo } from 'react';
import type { z } from 'zod';

export interface FormValuesStore {
  getFieldsValue: (all?: true) => unknown;
}

export type FormErrorTarget<Values = unknown> = Pick<FormInstance<Values>, 'setFields'>;

export type ZodValidatorRule = {
  validator: (
    rule?: { field?: string | (string | number)[] } | object,
    value?: unknown,
  ) => Promise<void>;
};

export type ZodFormRule = ((form: FormValuesStore) => ZodValidatorRule) & ZodValidatorRule;

/**
 * Converts a dot-delimited field path (`'consents.x'`, `'items.0.name'`, `'slug'`)
 * into an Ant Design `NamePath` array (`['consents', 'x']`, `['items', 0, 'name']`, `['slug']`).
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
 * Ant Design `Form.Item` rule adapter backed by a Zod schema.
 *
 * Runs `schema.safeParse(form.getFieldsValue(true))` and rejects with the message of the first
 * issue whose `issue.path` matches the `Form.Item`'s `name` (supporting flat fields, nested paths,
 * and cross-field `refine` / `superRefine`).
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

/**
 * Binds an Ant Design `FormInstance` to a contract Zod schema.
 *
 * - `form`: Ant Design form instance (`Form.useForm()`).
 * - `rules`: pass directly to `<Form.Item rules={rules}>`.
 * - `parse(values)`: parses form values through `schema.parse` and returns `z.output<S>`.
 */
export function useZodForm<S extends z.ZodType>(
  schema: S,
  existingForm?: FormInstance<z.input<S>>,
): UseZodFormResult<S> {
  const [form] = Form.useForm<z.input<S>>(existingForm);

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
 * Maps an API error (`details.field` or `details.body.fieldErrors`) onto Ant Design form fields
 * via `form.setFields`. Returns `false` when no field error could be attached so the caller can
 * fall back to `message.error(...)`.
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

  type FieldName = Parameters<FormInstance<Values>['setFields']>[0][number]['name'];

  if (typeof details.field === 'string' && details.field.trim().length > 0) {
    const code = (typeof errObj.code === 'string' ? errObj.code : 'INTERNAL') as Code;
    const message = messageFor
      ? messageFor(code)
      : typeof errObj.message === 'string' && errObj.message.length > 0
        ? errObj.message
        : code;

    form.setFields([
      {
        name: toNamePath(details.field) as unknown as FieldName,
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
          name: toNamePath(field) as unknown as FieldName,
          errors: messages,
        })),
      );
      return true;
    }
  }

  return false;
}
