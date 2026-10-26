'use client';

import { Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';

export const WATERMARK_HREF = 'https://playora.vn/?ref=watermark';

/** "Tạo bằng Playora" badge on Free-plan campaigns (BIL-02); the server decides via `watermark`. */
export function PlayoraWatermark() {
  const t = useTranslations('play');
  return (
    <Tag bordered={false} className="m-0" data-testid="playora-watermark">
      <Typography.Link href={WATERMARK_HREF} target="_blank" rel="noopener">
        {t('watermark')}
      </Typography.Link>
    </Tag>
  );
}
