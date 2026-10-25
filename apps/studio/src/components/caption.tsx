'use client';

import { Typography, theme } from 'antd';
import type { TextProps } from 'antd/es/typography/Text';

/** body-sm (12/20) secondary text: hints, metadata, timestamps. The only small-text style in Studio. */
export function Caption({ type = 'secondary', style, ...props }: TextProps) {
  const { token } = theme.useToken();

  return (
    <Typography.Text
      type={type}
      style={{ fontSize: token.fontSizeSM, lineHeight: token.lineHeightSM, ...style }}
      {...props}
    />
  );
}
