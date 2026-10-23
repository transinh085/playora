import type { Metadata } from 'next';
import { ScreenShell } from './_components/screen-shell';

export const metadata: Metadata = {
  title: 'Playora Screen',
};

export default function ScreenPage() {
  return <ScreenShell />;
}
