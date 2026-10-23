import { Logo } from '@playora/ui/components/logo';
import { GameRoot } from '@playora/ui/game/game-root';
import Link from 'next/link';

export default function Home() {
  return (
    <GameRoot asChild>
      <main className="mx-auto flex max-w-md flex-col justify-center gap-6 p-6">
        <h1>
          <Logo className="text-2xl" />
        </h1>
        <p className="text-game-muted">Quét mã QR trên màn hình sự kiện để tham gia.</p>
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
    </GameRoot>
  );
}
