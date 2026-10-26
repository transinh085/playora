import type { PlayResult } from '@playora/contracts';
import { isCaptchaRequiredError } from './play-request';

export interface ExecutePlayWithCaptchaOptions {
  requestId: string;
  captchaSiteKey: string | null;
  currentCaptchaToken: string | null;
  channel?: string;
  acquireCaptchaToken: () => Promise<string>;
  resetTurnstile: () => void;
  onTokenUpdated: (token: string | null) => void;
  callPlayApi: (body: {
    requestId: string;
    channel?: string;
    captchaToken?: string;
  }) => Promise<PlayResult>;
}

/**
 * Handles captcha token attachment and retry on 403 CAPTCHA_REQUIRED (docs/engineering/security.md §1.3).
 * On 403, resets the widget, acquires a fresh challenge solution, and retries with the SAME requestId.
 */
export async function executePlayWithCaptcha(
  options: ExecutePlayWithCaptchaOptions,
): Promise<PlayResult> {
  const {
    requestId,
    captchaSiteKey,
    currentCaptchaToken,
    channel,
    acquireCaptchaToken,
    resetTurnstile,
    onTokenUpdated,
    callPlayApi,
  } = options;

  let token = currentCaptchaToken;
  if (captchaSiteKey && !token) {
    token = await acquireCaptchaToken();
    onTokenUpdated(token);
  }

  const makeBody = (t?: string | null) => ({
    requestId,
    ...(channel ? { channel } : {}),
    ...(t ? { captchaToken: t } : {}),
  });

  try {
    return await callPlayApi(makeBody(token));
  } catch (error) {
    if (isCaptchaRequiredError(error)) {
      resetTurnstile();
      onTokenUpdated(null);
      const freshToken = await acquireCaptchaToken();
      onTokenUpdated(freshToken);
      return await callPlayApi(makeBody(freshToken));
    }
    throw error;
  }
}
