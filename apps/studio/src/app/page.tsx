import { SessionPanel } from './session-panel';

async function apiHealth() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/health`, { cache: 'no-store' });
    return (await res.json()) as { status: string; db: string; redis: string };
  } catch {
    return null;
  }
}

export default async function StudioHome() {
  const health = await apiHealth();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Playora Studio</h1>
        <p className="opacity-70">Dựng game sự kiện từ template — builder đến ở M1.</p>
      </header>
      <SessionPanel />
      <section className="rounded-xl border border-border p-4 text-sm">
        <h2 className="mb-2 font-semibold">Trạng thái hệ thống</h2>
        {health ? (
          <p>
            API: {health.status} · DB: {health.db} · Redis: {health.redis}
          </p>
        ) : (
          <p className="text-red-600">Không gọi được API ({process.env.NEXT_PUBLIC_API_URL})</p>
        )}
      </section>
    </main>
  );
}
