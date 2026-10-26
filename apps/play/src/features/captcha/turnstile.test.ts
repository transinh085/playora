import { afterEach, describe, expect, mock, test } from 'bun:test';
import {
  getTurnstile,
  getTurnstileResponse,
  isTurnstileReady,
  removeTurnstile,
  renderTurnstile,
  resetTurnstile,
  type TurnstileApi,
  type TurnstileRenderOptions,
} from './turnstile';

describe('Turnstile typed wrapper', () => {
  const globalWithWindow = globalThis as unknown as { window?: { turnstile?: TurnstileApi } };
  const originalWindow = globalWithWindow.window;

  afterEach(() => {
    globalWithWindow.window = originalWindow;
  });

  test('reports not ready when window is missing or window.turnstile is missing', () => {
    delete globalWithWindow.window;
    expect(isTurnstileReady()).toBe(false);
    expect(getTurnstile()).toBeUndefined();
    expect(renderTurnstile('container-id', { sitekey: 'key' })).toBeNull();

    globalWithWindow.window = {};
    expect(isTurnstileReady()).toBe(false);
    expect(getTurnstile()).toBeUndefined();
  });

  test('renders, resets, and removes with fake window.turnstile', () => {
    let capturedOptions: TurnstileRenderOptions | null = null;
    const fakeApi: TurnstileApi = {
      render: mock((_container: string | HTMLElement, options: TurnstileRenderOptions) => {
        capturedOptions = options;
        return 'widget-123';
      }),
      reset: mock((_widgetId) => {}),
      remove: mock((_widgetId) => {}),
      getResponse: mock((_widgetId) => 'solved-token'),
    };
    globalWithWindow.window = { turnstile: fakeApi };

    expect(isTurnstileReady()).toBe(true);

    const onSolve = mock((_token: string) => {});
    const onError = mock((_err?: string | number) => {});
    const onExpired = mock(() => {});

    const widgetId = renderTurnstile('container-id', {
      sitekey: '0x4AAAAAA',
      size: 'flexible',
      callback: onSolve,
      'error-callback': onError,
      'expired-callback': onExpired,
    });

    expect(widgetId).toBe('widget-123');
    expect(fakeApi.render).toHaveBeenCalled();
    expect(capturedOptions).toMatchObject({
      sitekey: '0x4AAAAAA',
      size: 'flexible',
    });

    // Simulate token received
    const opts = capturedOptions as TurnstileRenderOptions | null;
    opts?.callback?.('token-abc');
    expect(onSolve).toHaveBeenCalledWith('token-abc');

    // Simulate error
    opts?.['error-callback']?.('error-code');
    expect(onError).toHaveBeenCalledWith('error-code');

    // Simulate expired
    opts?.['expired-callback']?.();
    expect(onExpired).toHaveBeenCalled();

    // Check response
    expect(getTurnstileResponse(widgetId ?? undefined)).toBe('solved-token');

    // Reset
    resetTurnstile(widgetId ?? undefined);
    expect(fakeApi.reset).toHaveBeenCalledWith('widget-123');

    // Remove
    removeTurnstile(widgetId ?? undefined);
    expect(fakeApi.remove).toHaveBeenCalledWith('widget-123');
  });
});
