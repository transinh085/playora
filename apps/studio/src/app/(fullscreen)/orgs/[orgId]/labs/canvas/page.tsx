import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CanvasEditor } from '@/features/canvas-editor/components/canvas-editor';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('canvasLab'))('title') };
}

export default async function CanvasLabPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return <CanvasEditor orgId={orgId} />;
}
