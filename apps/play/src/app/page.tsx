import { Logo } from '@playora/ui/components/logo';
import { GameRoot } from '@playora/ui/game/game-root';

export default function Home() {
  return (
    <GameRoot asChild>
      <main className="mx-auto flex max-w-md flex-col justify-center gap-6 p-6">
        <h1>
          <Logo className="text-2xl" />
        </h1>
        <p className="text-game-muted">Quét mã QR trên màn hình sự kiện để tham gia.</p>
      </main>
    </GameRoot>
  );
}
