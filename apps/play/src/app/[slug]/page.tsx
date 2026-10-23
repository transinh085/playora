import { notFound } from 'next/navigation';

interface PublicEvent {
  id: string;
  name: string;
  status: string;
}

async function getEvent(slug: string): Promise<PublicEvent | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/p/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/** Player shell for an event. The join flow and game surfaces land in M1 (EVT-02, LIV-*). */
export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 p-6 text-center">
      <p className="text-sm uppercase tracking-widest opacity-60">Chào mừng đến</p>
      <h1 className="text-3xl font-extrabold">{event.name}</h1>
      <p className="opacity-70">Sự kiện chưa bắt đầu. Vui lòng chờ MC mở cổng tham gia.</p>
    </main>
  );
}
