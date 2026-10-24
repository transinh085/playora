import { GameRoot } from '@playora/ui/game/game-root';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/logo';

export default function Home() {
  const t = useTranslations('play');
  return (
    <GameRoot asChild>
      <main className="mx-auto flex max-w-md flex-col justify-center gap-6 p-6">
        <h1>
          <Logo className="text-2xl" />
        </h1>
        <p className="text-game-muted">{t('scanQrHint')}</p>
      </main>
    </GameRoot>
  );
}
