'use client';

import { useId } from 'react';
import type { PlayerFormErrors, PlayerFormValues } from './form-validation';
import type { CampaignPlayerLabels } from './labels';
import { type BrandPalette, type FormElement, resolveColor } from './model';

/**
 * The real, fillable form drawn inside the canvas form box (`CanvasRuntime.renderForm`). Game
 * content, so it follows the brand palette and matches the editor's static mock.
 */
export function PlayerForm({
  element,
  brand,
  labels,
  values,
  errors,
  onChange,
  showMarketingConsent = false,
  onOpenRules,
  duplicatePhone = false,
  onRestorePrizes,
}: {
  element: FormElement;
  brand: BrandPalette;
  labels: CampaignPlayerLabels;
  values: PlayerFormValues;
  errors: PlayerFormErrors;
  onChange: (patch: Partial<PlayerFormValues>) => void;
  showMarketingConsent?: boolean;
  onOpenRules?: () => void;
  duplicatePhone?: boolean;
  onRestorePrizes?: () => void;
}) {
  const id = useId();
  const color = resolveColor(element.color, brand);

  const input = {
    height: 46,
    borderRadius: 12,
    border: 0,
    padding: '0 14px',
    fontSize: 16,
    fontFamily: 'var(--font-sans)',
    background: 'rgba(255,255,255,.95)',
    color: brand.primary,
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,.15)',
    outlineColor: brand.accent,
  } as const;
  const error = (key: 'name' | 'phone' | 'consent') => {
    const code = errors[key];
    return code ? (
      <span
        id={`${id}-${key}-error`}
        style={{ fontSize: 12, fontWeight: 600, color: brand.accent }}
      >
        {labels.form.errors[code]}
      </span>
    ) : null;
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        color,
      }}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{labels.canvas.fullName}</span>
        <input
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={labels.form.namePlaceholder}
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          style={input}
        />
        {error('name')}
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{labels.canvas.phone}</span>
        <input
          value={values.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder={labels.form.phonePlaceholder}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone) || duplicatePhone}
          aria-describedby={errors.phone ? `${id}-phone-error` : undefined}
          style={input}
        />
        {error('phone')}
      </label>
      {duplicatePhone && (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(255, 251, 235, 0.96)',
            color: '#78350f',
            fontSize: 12,
            lineHeight: 1.4,
            boxShadow: '0 2px 8px rgba(0,0,0,.15)',
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {labels.form.duplicatePhoneHint ??
              'Số điện thoại này đã tham gia trên trình duyệt hoặc thiết bị khác.'}
          </span>
          {onRestorePrizes && (
            <button
              type="button"
              onClick={onRestorePrizes}
              style={{
                alignSelf: 'flex-start',
                padding: '6px 12px',
                borderRadius: 8,
                border: 0,
                background: '#d97706',
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {labels.form.restorePrizesCta ?? 'Khôi phục mã quà đã trúng'}
            </button>
          )}
        </div>
      )}
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
        <input
          type="checkbox"
          checked={values.consent}
          onChange={(e) => onChange({ consent: e.target.checked })}
          aria-invalid={Boolean(errors.consent)}
          style={{ width: 20, height: 20, margin: 0, flex: 'none', accentColor: brand.accent }}
        />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.35 }}>
          {labels.canvas.consent}
          {error('consent')}
        </span>
      </label>
      {showMarketingConsent && labels.canvas.marketingConsent && (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={Boolean(values.marketingConsent)}
            onChange={(e) => onChange({ marketingConsent: e.target.checked })}
            style={{ width: 20, height: 20, margin: 0, flex: 'none', accentColor: brand.accent }}
          />
          <span style={{ lineHeight: 1.35, opacity: 0.9 }}>{labels.canvas.marketingConsent}</span>
        </label>
      )}
      {onOpenRules && (
        <button
          type="button"
          onClick={onOpenRules}
          style={{
            alignSelf: 'flex-start',
            padding: 0,
            border: 0,
            background: 'transparent',
            color,
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'underline',
            cursor: 'pointer',
            opacity: 0.9,
          }}
        >
          {labels.canvas.viewFullRules ?? labels.rules.fullTerms}
        </button>
      )}
    </div>
  );
}
