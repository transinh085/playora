import { GameRoot } from '@playora/ui/game/game-root';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/logo';

/** Unknown or unpublished campaign link. */
export default function NotFound() {
  const t = useTranslations('play');
  return (
    <GameRoot asChild>
      <main className="mx-auto flex max-w-md flex-col justify-center gap-4 p-6 text-center">
        <Logo className="text-2xl" />
        <h1 className="font-game text-xl">{t('notFoundTitle')}</h1>
        <p className="text-game-muted">{t('notFoundBody')}</p>
      </main>
    </GameRoot>
  );
}
