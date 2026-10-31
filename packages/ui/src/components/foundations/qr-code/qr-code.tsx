'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function QRCodeSvg({
  value,
  size = 128,
  color = '#000000',
  className,
}: {
  value: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    if (!value) {
      setSvg('');
      return;
    }
    QRCode.toString(
      value,
      {
        type: 'svg',
        width: size,
        margin: 1,
        color: { dark: color, light: '#00000000' },
      },
      (err, str) => {
        if (!err && str) setSvg(str);
      },
    );
  }, [value, size, color]);

  if (!svg) {
    return <div style={{ width: size, height: size }} className={className} />;
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
