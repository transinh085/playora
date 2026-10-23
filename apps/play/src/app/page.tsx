import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-extrabold">Playora Play</h1>
      <p className="opacity-70">Quét mã QR trên màn hình sự kiện để tham gia.</p>
      <nav className="grid gap-2 text-sm">
        <span className="font-semibold">Spike M0 (shake race)</span>
        <Link className="underline" href="/spike/player">
          Người chơi
        </Link>
        <Link className="underline" href="/spike/screen">
          Màn hình LED
        </Link>
        <Link className="underline" href="/spike/host">
          MC điều khiển
        </Link>
      </nav>
    </main>
  );
}
