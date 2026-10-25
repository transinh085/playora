'use client';

import { Flex, theme } from 'antd';

export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info';

/** Tinted icon tile: pale tone background, tone-coloured icon (games-vt look, docs/13 §3.4). */
export function IconTile({
  tone = 'primary',
  size = 44,
  children,
}: {
  tone?: Tone;
  size?: number;
  children: React.ReactNode;
}) {
  const { token } = theme.useToken();
  const tones: Record<Tone, [string, string]> = {
    primary: [token.colorPrimary, token.colorPrimaryBg],
    success: [token.colorSuccess, token.colorSuccessBg],
    warning: [token.colorWarning, token.colorWarningBg],
    error: [token.colorError, token.colorErrorBg],
    info: [token.colorInfo, token.colorInfoBg],
  };
  const [color, background] = tones[tone];

  return (
    <Flex
      align="center"
      justify="center"
      className="shrink-0"
      style={{ width: size, height: size, borderRadius: size >= 40 ? 10 : 8, background, color }}
    >
      {children}
    </Flex>
  );
}
