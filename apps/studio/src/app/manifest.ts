import type { MetadataRoute } from 'next';

/**
 * Web App Manifest for Counter PWA / Add to Home Screen (PRZ-18).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Playora Quầy Đổi Quà',
    short_name: 'Playora Quầy',
    description: 'Quét mã QR, tra cứu số điện thoại và xác nhận đổi quà tại quầy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0D9488',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  };
}
