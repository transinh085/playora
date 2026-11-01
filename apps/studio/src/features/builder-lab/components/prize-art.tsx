import { IMAGE_PRESETS } from '@playora/ui/campaign';
import { Gift } from '@playora/ui/icons';

function resolvePrizeSrc(value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/')) {
    return value;
  }
  const preset = IMAGE_PRESETS.find((p) => p.key === value);
  return preset?.src ?? null;
}

/** Renders a prize's preset sticker, uploaded image URL, or fallback gift icon. */
export function PrizeArt({
  value,
  size = 36,
  className,
}: {
  value?: string | null;
  size?: number;
  className?: string;
}) {
  const src = resolvePrizeSrc(value);
  if (!src) {
    return (
      <Gift
        className={className ?? 'text-text-tertiary'}
        style={{ width: size * 0.6, height: size * 0.6 }}
      />
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: inline SVG data URLs or presigned asset URLs
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className ?? 'object-contain'}
      style={{ width: size, height: size }}
    />
  );
}
