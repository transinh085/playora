'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { useTranslations } from 'next-intl';

export const WATERMARK_HREF = 'https://playora.vn/?ref=watermark';

/** "Tạo bằng Playora" badge on Free-plan campaigns (BIL-02); the server decides via `watermark`. */
export function PlayoraWatermark() {
  const t = useTranslations('play');
  return (
    <Chip
      variant="caption"
      color="neutral"
      className="m-0 text-xs shadow-xs"
      data-testid="playora-watermark"
    >
      <a href={WATERMARK_HREF} target="_blank" rel="noopener" className="hover:underline">
        {t('watermark')}
      </a>
    </Chip>
  );
}
