'use client';

import type { ApiErrorBody, ErrorCode, JoinEventResponse, PublicEvent } from '@playora/contracts';
import { GameButton } from '@playora/ui/game/game-button';
import { GameRoot } from '@playora/ui/game/game-root';
import { JoinPanel } from '@playora/ui/game/join-panel';
import type { BrandKitTheme } from '@playora/ui/lib/game-theme';
import { type FormEvent, useMemo, useState } from 'react';
import { getOrCreateDeviceId, usePlayerSession } from '@/lib/player-session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  GUEST_CODE_NOT_FOUND: 'Mã khách mời không tồn tại trong sự kiện này.',
  GUEST_CODE_ALREADY_USED:
    'Mã khách mời đã được sử dụng trên thiết bị khác. Vui lòng liên hệ ban tổ chức để mở khoá.',
  PLAYER_LIMIT_REACHED: 'Sự kiện đã đủ số người tham gia.',
  EVENT_NOT_LIVE: 'Sự kiện chưa mở hoặc đã kết thúc.',
  RATE_LIMITED: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.',
  VALIDATION_FAILED: 'Thông tin chưa hợp lệ, vui lòng kiểm tra lại.',
  NOT_FOUND: 'Sự kiện chưa mở cổng tham gia.',
};

export function EventJoinShell({ event }: { event: PublicEvent }) {
  const { session, hydrated, setSession } = usePlayerSession(event.slug);

  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fields, setFields] = useState<Record<string, string | boolean>>(() => {
    const init: Record<string, string | boolean> = {};
    for (const f of event.registrationForm.fields) {
      init[f.key] = f.type === 'checkbox' ? false : '';
    }
    return init;
  });
  const [consents, setConsents] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of event.consents) {
      init[c.purpose] = false;
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const brandTheme = useMemo<BrandKitTheme | undefined>(() => {
    if (!event.brandKit) return undefined;
    return {
      primary: event.brandKit.colors.primary,
      accent: event.brandKit.colors.secondary,
      background: event.brandKit.colors.background,
      text: event.brandKit.colors.text,
      fontDisplay: event.brandKit.fontHeading,
    };
  }, [event.brandKit]);

  const bgStyle = useMemo(() => {
    if (!event.brandKit?.backgroundUrl) return undefined;
    return {
      backgroundImage: `linear-gradient(to bottom, oklch(0 0 0 / 55%), oklch(0 0 0 / 75%)), url(${event.brandKit.backgroundUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }, [event.brandKit?.backgroundUrl]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    for (const c of event.consents) {
      if (c.required && !consents[c.purpose]) {
        setErrorMsg('Vui lòng đồng ý với điều khoản bắt buộc để tiếp tục.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(`${API_URL}/v1/p/${encodeURIComponent(event.slug)}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          displayName: displayName.trim() || undefined,
          code: event.identity === 'guest_list' ? code.trim() : undefined,
          fields: event.registrationForm.fields.length > 0 ? fields : undefined,
          consents: event.consents.length > 0 ? consents : undefined,
        }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null;
        const errCode = errBody?.error?.code;
        setErrorMsg(
          (errCode && ERROR_MESSAGES[errCode]) ||
            errBody?.error?.message ||
            'Không thể tham gia sự kiện. Vui lòng thử lại.',
        );
        return;
      }

      const data = (await res.json()) as JoinEventResponse;
      setSession(data);
    } catch {
      setErrorMsg('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GameRoot brand={brandTheme} style={bgStyle} className="flex flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
        <header className="flex flex-col items-center gap-3 text-center">
          {event.brandKit?.logoUrl && (
            // biome-ignore lint/performance/noImgElement: presigned S3 URLs have dynamic hosts
            <img
              src={event.brandKit.logoUrl}
              alt={event.name}
              className="h-16 w-auto object-contain"
            />
          )}
          <p className="text-game-muted text-sm font-medium">Chào mừng đến</p>
          <h1 className="font-game text-3xl font-bold text-balance">{event.name}</h1>
          <JoinPanel
            url={`play.playora.vn/${event.slug}`}
            className="mt-1 justify-center rounded-game border border-game-border bg-game-surface px-4 py-2.5 text-left text-sm"
          />
        </header>

        {hydrated && session ? (
          <section
            data-testid="player-lobby"
            className="flex flex-col items-center gap-3 rounded-game border border-game-border bg-game-surface p-6 text-center backdrop-blur-sm"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-game-primary/20 px-3 py-1 text-sm font-semibold text-game-primary">
              <span className="size-2 rounded-full bg-game-primary" />
              Đã tham gia — chờ MC bắt đầu
            </span>
            <p className="font-game text-2xl font-bold" data-testid="player-display-name">
              {session.player.displayName}
            </p>
            {session.player.team && (
              <p className="text-game-muted text-base font-medium" data-testid="player-team">
                Đội: <span className="text-game-fg font-semibold">{session.player.team}</span>
              </p>
            )}
          </section>
        ) : event.status === 'draft' ? (
          <p className="text-game-muted text-center">
            Sự kiện chưa bắt đầu. Vui lòng chờ MC mở cổng tham gia.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-game border border-game-border bg-game-surface p-5 backdrop-blur-sm"
          >
            {event.playerLimitReached && event.identity !== 'guest_list' && (
              <p
                role="alert"
                className="rounded-game border border-game-urgent/50 bg-game-urgent/15 p-3 text-center text-sm font-medium"
              >
                Sự kiện đã đủ số người tham gia.
              </p>
            )}

            {event.identity === 'guest_list' && (
              <div className="grid gap-2 text-left">
                <label htmlFor="join-code" className="text-sm font-semibold">
                  Mã tham gia <span className="text-game-urgent">*</span>
                </label>
                <input
                  id="join-code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Nhập mã khách mời (VD: NV0001)"
                  className="h-14 rounded-game border border-game-border bg-game-bg/60 px-4 text-lg outline-none placeholder:text-game-muted focus-visible:ring-4 focus-visible:ring-game-fg/40"
                />
              </div>
            )}

            {event.identity === 'anonymous' && (
              <div className="grid gap-2 text-left">
                <label htmlFor="join-display-name" className="text-sm font-semibold">
                  Tên hiển thị
                </label>
                <input
                  id="join-display-name"
                  type="text"
                  maxLength={120}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nhập tên của bạn (tuỳ chọn)"
                  className="h-14 rounded-game border border-game-border bg-game-bg/60 px-4 text-lg outline-none placeholder:text-game-muted focus-visible:ring-4 focus-visible:ring-game-fg/40"
                />
              </div>
            )}

            {event.registrationForm.fields.map((field) => {
              const fieldId = `join-field-${field.key}`;
              if (field.type === 'checkbox') {
                return (
                  <label
                    key={field.key}
                    htmlFor={fieldId}
                    className="flex items-start gap-3 text-left text-base"
                  >
                    <input
                      id={fieldId}
                      type="checkbox"
                      required={field.required}
                      checked={Boolean(fields[field.key])}
                      onChange={(e) =>
                        setFields((prev) => ({ ...prev, [field.key]: e.target.checked }))
                      }
                      className="mt-1 size-5 shrink-0 accent-game-primary"
                    />
                    <span>
                      {field.label.vi}
                      {field.required && <span className="text-game-urgent"> *</span>}
                    </span>
                  </label>
                );
              }

              if (field.type === 'select') {
                return (
                  <div key={field.key} className="grid gap-2 text-left">
                    <label htmlFor={fieldId} className="text-sm font-semibold">
                      {field.label.vi}
                      {field.required && <span className="text-game-urgent"> *</span>}
                    </label>
                    <select
                      id={fieldId}
                      required={field.required}
                      value={String(fields[field.key] ?? '')}
                      onChange={(e) =>
                        setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="h-14 rounded-game border border-game-border bg-game-bg/60 px-4 text-lg outline-none focus-visible:ring-4 focus-visible:ring-game-fg/40"
                    >
                      <option value="" className="text-black">
                        -- Chọn --
                      </option>
                      {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt} className="text-black">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              const inputType =
                field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text';
              return (
                <div key={field.key} className="grid gap-2 text-left">
                  <label htmlFor={fieldId} className="text-sm font-semibold">
                    {field.label.vi}
                    {field.required && <span className="text-game-urgent"> *</span>}
                  </label>
                  <input
                    id={fieldId}
                    type={inputType}
                    required={field.required}
                    value={String(fields[field.key] ?? '')}
                    onChange={(e) =>
                      setFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="h-14 rounded-game border border-game-border bg-game-bg/60 px-4 text-lg outline-none placeholder:text-game-muted focus-visible:ring-4 focus-visible:ring-game-fg/40"
                  />
                </div>
              );
            })}

            {event.consents.length > 0 && (
              <div className="grid gap-3 border-t border-game-border pt-3 text-left">
                {event.consents.map((consent) => {
                  const consentId = `join-consent-${consent.purpose}`;
                  return (
                    <label
                      key={consent.purpose}
                      htmlFor={consentId}
                      className="flex items-start gap-3 text-sm leading-relaxed"
                    >
                      <input
                        id={consentId}
                        type="checkbox"
                        checked={Boolean(consents[consent.purpose])}
                        onChange={(e) =>
                          setConsents((prev) => ({
                            ...prev,
                            [consent.purpose]: e.target.checked,
                          }))
                        }
                        className="mt-1 size-5 shrink-0 accent-game-primary"
                      />
                      <span>
                        {consent.text.vi}
                        {consent.required && <span className="text-game-urgent"> *</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {errorMsg && (
              <p
                role="alert"
                className="rounded-game border border-game-urgent/50 bg-game-urgent/15 p-3 text-center text-sm font-medium"
              >
                {errorMsg}
              </p>
            )}

            <GameButton type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
              {submitting ? 'Đang tham gia…' : 'Tham gia'}
            </GameButton>
          </form>
        )}
      </main>
    </GameRoot>
  );
}
