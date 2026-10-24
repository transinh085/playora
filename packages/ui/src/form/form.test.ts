import { describe, expect, mock, test } from 'bun:test';
import { Form, Input } from 'antd';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { z } from 'zod';
import { applyApiError, toNamePath, useZodForm, zodRule } from './index';

const EventSchema = z
  .object({
    slug: z
      .string()
      .min(3, 'Slug must be at least 3 chars')
      .transform((s) => s.trim().toLowerCase()),
    maxPlayers: z.number().int().positive().default(100),
    settings: z.object({
      contactEmail: z.email('Invalid contact email'),
    }),
    consents: z
      .object({
        marketing: z.boolean().optional(),
      })
      .optional(),
    items: z
      .array(
        z.object({
          label: z.string().min(1, 'Item label required'),
        }),
      )
      .optional(),
    startAt: z.string(),
    endAt: z.string(),
  })
  .refine((val) => val.endAt >= val.startAt, {
    path: ['endAt'],
    message: 'End date must not be before start date',
  });

type EventInput = z.input<typeof EventSchema>;
type EventOutput = z.output<typeof EventSchema>;

function makeMockForm(values: Record<string, unknown>) {
  return {
    getFieldsValue: mock((_all?: true) => values),
    setFields: mock(() => {}),
  };
}

function SampleEventForm({
  onParseReady,
}: {
  onParseReady: (parseFn: (v?: EventInput) => EventOutput) => void;
}) {
  const { form, rules, parse } = useZodForm(EventSchema);
  onParseReady(parse);
  return createElement(
    Form<EventInput>,
    { form, layout: 'vertical' },
    createElement(Form.Item, { name: 'slug', label: 'Slug', rules }, createElement(Input, null)),
  );
}

describe('zodRule', () => {
  test('validates flat fields against form.getFieldsValue(true)', async () => {
    const form = makeMockForm({
      slug: 'ab',
      settings: { contactEmail: 'valid@example.com' },
      startAt: '2026-10-24',
      endAt: '2026-10-25',
    });
    const rule = zodRule(EventSchema, form);

    await expect(rule.validator({ field: 'slug' }, 'ab')).rejects.toThrow(
      'Slug must be at least 3 chars',
    );
    expect(form.getFieldsValue).toHaveBeenCalledWith(true);

    const validForm = makeMockForm({
      slug: 'abc',
      settings: { contactEmail: 'valid@example.com' },
      startAt: '2026-10-24',
      endAt: '2026-10-25',
    });
    const validRule = zodRule(EventSchema)(validForm);
    await expect(validRule.validator({ field: 'slug' }, 'abc')).resolves.toBeUndefined();
  });

  test('validates nested object and array fields', async () => {
    const form = makeMockForm({
      slug: ' tet-2027 ',
      settings: { contactEmail: 'not-an-email' },
      items: [{ label: '' }],
      startAt: '2026-10-24',
      endAt: '2026-10-25',
    });
    const rule = zodRule(EventSchema, form);

    await expect(
      rule.validator({ field: 'settings.contactEmail' }, 'not-an-email'),
    ).rejects.toThrow('Invalid contact email');

    await expect(rule.validator({ field: 'items.0.label' }, '')).rejects.toThrow(
      'Item label required',
    );

    // Unrelated valid field passes even when nested fields have errors
    await expect(rule.validator({ field: 'slug' }, ' tet-2027 ')).resolves.toBeUndefined();
  });

  test('validates cross-field refine rules', async () => {
    const form = makeMockForm({
      slug: 'tet-2027',
      settings: { contactEmail: 'host@playora.vn' },
      startAt: '2026-10-25',
      endAt: '2026-10-20',
    });
    const rule = zodRule(EventSchema, form);

    await expect(rule.validator({ field: 'endAt' }, '2026-10-20')).rejects.toThrow(
      'End date must not be before start date',
    );
    await expect(rule.validator({ field: 'startAt' }, '2026-10-25')).resolves.toBeUndefined();
  });
});

describe('useZodForm', () => {
  test('creates form, rules, and parse returning z.output<schema>', () => {
    let capturedParse: ((v?: EventInput) => EventOutput) | null = null;

    const html = renderToString(
      createElement(SampleEventForm, {
        onParseReady: (fn) => {
          capturedParse = fn;
        },
      }),
    );
    expect(html).toContain('Slug');
    if (!capturedParse) {
      throw new Error('Expected parse function to be captured');
    }
    const parseFn: (v?: EventInput) => EventOutput = capturedParse;

    const output = parseFn({
      slug: '  YEP-2026  ',
      settings: { contactEmail: 'pm@agency.vn' },
      startAt: '2026-12-01',
      endAt: '2026-12-31',
    });
    expect(output.slug).toBe('yep-2026');
    expect(output.maxPlayers).toBe(100);
  });
});

describe('applyApiError', () => {
  test('maps details.field (flat and nested dot paths) via form.setFields', () => {
    const form = makeMockForm({});
    const conflictErr = {
      code: 'EVENT_SLUG_TAKEN' as const,
      message: 'Slug already exists',
      details: { field: 'consents.marketing' },
    };

    const handled = applyApiError(form, conflictErr, (code) => `translated:${code}`);
    expect(handled).toBe(true);
    expect(form.setFields).toHaveBeenCalledWith([
      {
        name: ['consents', 'marketing'],
        errors: ['translated:EVENT_SLUG_TAKEN'],
      },
    ]);
  });

  test('maps details.body.fieldErrors onto multiple fields', () => {
    const form = makeMockForm({});
    const validationErr = {
      code: 'VALIDATION_FAILED' as const,
      message: 'Validation failed',
      details: {
        body: {
          fieldErrors: {
            slug: ['Invalid slug'],
            'settings.contactEmail': ['Invalid email'],
            'items.0.label': ['Required'],
          },
        },
      },
    };

    const handled = applyApiError(form, validationErr);
    expect(handled).toBe(true);
    expect(form.setFields).toHaveBeenCalledWith([
      { name: ['slug'], errors: ['Invalid slug'] },
      { name: ['settings', 'contactEmail'], errors: ['Invalid email'] },
      { name: ['items', 0, 'label'], errors: ['Required'] },
    ]);
  });

  test('returns false when error cannot be attached to any field', () => {
    const form = makeMockForm({});

    expect(applyApiError(form, null)).toBe(false);
    expect(applyApiError(form, new Error('network'))).toBe(false);
    expect(applyApiError(form, { code: 'INTERNAL', message: 'Server error' })).toBe(false);
    expect(
      applyApiError(form, {
        code: 'VALIDATION_FAILED',
        details: { body: { fieldErrors: {} } },
      }),
    ).toBe(false);
    expect(form.setFields).not.toHaveBeenCalled();
  });

  test('toNamePath converts dot strings and numeric indices', () => {
    expect(toNamePath('slug')).toEqual(['slug']);
    expect(toNamePath('consents.x')).toEqual(['consents', 'x']);
    expect(toNamePath('items.2.label')).toEqual(['items', 2, 'label']);
  });
});
