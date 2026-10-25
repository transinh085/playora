'use client';

import type { PreviewBrand } from '@playora/game-sdk';
import { theme } from 'antd';
import { usePreviewChannel } from '../lib/use-preview-channel';

const NO_ASSETS: Record<string, string> = {};
/** Play renders at a phone viewport; the frame is scaled down instead of squeezing the layout. */
const VIEWPORT = { width: 360, height: 640 };

/** A template rendered by the real Play runtime, at any height (gallery thumbnails and preview). */
export function TemplatePreview({
  templateId,
  skinKey,
  config,
  brand,
  locale,
  height,
  title,
  interactive = false,
}: {
  templateId: string;
  skinKey: string;
  config: Record<string, unknown>;
  brand: PreviewBrand;
  locale: 'vi' | 'en';
  height: number;
  title: string;
  interactive?: boolean;
}) {
  const { token } = theme.useToken();
  const { iframeRef, previewSrc, onLoad } = usePreviewChannel({
    templateId,
    config,
    skinKey,
    brand,
    locale,
    outcome: 'win',
    assets: NO_ASSETS,
  });
  const scale = height / VIEWPORT.height;

  return (
    <div
      style={{
        width: VIEWPORT.width * scale,
        height,
        overflow: 'hidden',
        borderRadius: 16 * scale + 8,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorFillQuaternary,
      }}
    >
      <iframe
        ref={iframeRef}
        src={previewSrc}
        title={title}
        onLoad={onLoad}
        loading="lazy"
        tabIndex={interactive ? 0 : -1}
        style={{
          ...VIEWPORT,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      />
    </div>
  );
}
