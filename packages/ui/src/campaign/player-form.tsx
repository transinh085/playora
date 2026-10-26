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
}: {
  element: FormElement;
  brand: BrandPalette;
  labels: CampaignPlayerLabels;
  values: PlayerFormValues;
  errors: PlayerFormErrors;
  onChange: (patch: Partial<PlayerFormValues>) => void;
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
  const error = (key: keyof PlayerFormValues) => {
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
        gap: 12,
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
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? `${id}-phone-error` : undefined}
          style={input}
        />
        {error('phone')}
      </label>
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
    </div>
  );
}
