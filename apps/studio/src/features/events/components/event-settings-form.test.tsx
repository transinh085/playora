/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { routeKey } from '@playora/api-client';
import { brandKitsApi, type EventSummary, eventsApi, UpdateEventBody } from '@playora/contracts';
import { getMessages } from '@playora/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { EventSettingsForm, toEventSettingsFormValues } from './event-settings-form';
import { fromDatetimeLocalValue, toDatetimeLocalValue } from './event-settings-form-general';

const sampleEvent: EventSummary = {
  id: '11111111-1111-4111-8111-111111111111',
  organizationId: 'org_123',
  brandKitId: null,
  slug: 'gala-2026',
  name: 'Gala 2026',
  status: 'draft',
  identity: 'guest_list',
  registrationForm: {
    fields: [
      {
        key: 'department',
        type: 'select',
        label: { vi: 'Phòng ban', en: 'Department' },
        required: true,
        options: ['Engineering', 'Sales'],
      },
    ],
    consents: [
      {
        purpose: 'participation',
        text: { vi: 'Đồng ý tham gia', en: undefined },
        required: true,
        textVersion: 'v1',
      },
    ],
  },
  timezone: 'Asia/Ho_Chi_Minh',
  startsAt: '2026-10-24T10:00:00.000Z',
  endsAt: '2026-10-25T10:00:00.000Z',
  playerLimit: 500,
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

describe('event-settings-form helpers', () => {
  test('converts between ISO datetime and datetime-local input value', () => {
    expect(toDatetimeLocalValue(null)).toBe('');
    expect(toDatetimeLocalValue(undefined)).toBe('');
    expect(toDatetimeLocalValue('not-a-date')).toBe('');

    const iso = '2026-10-24T10:30:00.000Z';
    const localVal = toDatetimeLocalValue(iso);
    expect(localVal).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromDatetimeLocalValue(localVal)).toBe(iso);

    expect(fromDatetimeLocalValue('')).toBeNull();
    expect(fromDatetimeLocalValue('   ')).toBeNull();
    expect(fromDatetimeLocalValue('invalid')).toBeNull();
  });

  test('maps EventSummary to form values and normalizes identity mode', () => {
    const mapped = toEventSettingsFormValues(sampleEvent);
    expect(mapped.name).toBe('Gala 2026');
    expect(mapped.identity).toBe('guest_list');
    expect(mapped.playerLimit).toBe(500);
    expect(mapped.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(mapped.registrationForm?.fields).toHaveLength(1);
    expect(mapped.registrationForm?.consents).toHaveLength(1);
    expect(() => UpdateEventBody.parse(mapped)).not.toThrow();

    const fallbackIdentity = toEventSettingsFormValues({
      ...sampleEvent,
      identity: 'phone_otp',
      registrationForm: null,
    });
    expect(fallbackIdentity.identity).toBe('anonymous');
    expect(fallbackIdentity.registrationForm).toEqual({ fields: [], consents: [] });
  });
});

const viMessages = getMessages('vi');

describe('EventSettingsForm loading -> loaded lifecycle', () => {
  test('renders through loading -> partial loading -> loaded without unconnected useForm console warnings and with valid label associations', async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    const origError = console.error;
    const g = globalThis as { window?: unknown };
    const hadWindow = 'window' in g;
    const origWindow = g.window;

    console.warn = (...args) => warnings.push(args.map(String).join(' '));
    console.error = (...args) => warnings.push(args.map(String).join(' '));
    if (!hadWindow) {
      g.window = globalThis;
    }

    try {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Number.POSITIVE_INFINITY,
          },
        },
      });

      const renderForm = () =>
        renderToString(
          <QueryClientProvider client={queryClient}>
            <NextIntlClientProvider locale="vi" messages={viMessages} timeZone="Asia/Ho_Chi_Minh">
              <App>
                <EventSettingsForm orgId={sampleEvent.organizationId} eventId={sampleEvent.id} />
              </App>
            </NextIntlClientProvider>
          </QueryClientProvider>,
        );

      // 1. Both queries pending -> renders Skeleton without creating or touching a Form instance
      const loadingHtml = renderForm();
      expect(loadingHtml).toContain('ant-skeleton');

      // 2. Event query cached while brandKits query is still pending -> still renders Skeleton
      queryClient.setQueryData(
        routeKey(eventsApi.get, {
          params: { orgId: sampleEvent.organizationId, eventId: sampleEvent.id },
        }),
        sampleEvent,
      );
      const partialLoadingHtml = renderForm();
      expect(partialLoadingHtml).toContain('ant-skeleton');

      // 3. Both queries resolved -> mounts inner Form with initialValues
      queryClient.setQueryData(
        routeKey(brandKitsApi.list, {
          params: { orgId: sampleEvent.organizationId },
          query: { limit: 100 },
        }),
        { items: [], nextCursor: null },
      );
      const loadedHtml = renderForm();

      // Flush macrotask timer used by @rc-component/form warningUnhooked
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(
        warnings.filter((w) =>
          w.includes('Instance created by `useForm` is not connected to any Form element'),
        ),
      ).toEqual([]);
      expect(warnings).toEqual([]);

      expect(loadedHtml).toContain('Gala 2026');
      expect(loadedHtml).toContain(viMessages.events.scheduleDescription);
      expect(loadedHtml).toContain(viMessages.events.participationDescription);
      expect(loadedHtml).toContain('Engineering, Sales');
      expect(loadedHtml).toContain('v1');

      const labelForIds = [...loadedHtml.matchAll(/<label[^>]*for="([^"]+)"[^>]*>/g)].map(
        (m) => m[1],
      );
      const elementIds = new Set([...loadedHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      expect(labelForIds.length).toBeGreaterThan(0);
      for (const targetId of labelForIds) {
        expect(elementIds.has(targetId)).toBe(true);
      }
    } finally {
      console.warn = origWarn;
      console.error = origError;
      if (!hadWindow) {
        delete g.window;
      } else {
        g.window = origWindow;
      }
    }
  });
});
