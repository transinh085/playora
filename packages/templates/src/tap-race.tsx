import {
  type BrandKit,
  type HostPanelProps,
  type PlayerProps,
  resolveLocalizedText,
  type ScreenProps,
} from '@playora/game-sdk';
import { Countdown } from '@playora/ui/game/countdown';
import { GameButton } from '@playora/ui/game/game-button';
import { GameRoot } from '@playora/ui/game/game-root';
import { Leaderboard } from '@playora/ui/game/leaderboard';
import { Stage } from '@playora/ui/game/stage';
import { TeamBar } from '@playora/ui/game/team-bar';
import {
  type BrandKitTheme,
  type Skin as UiSkin,
  skins as uiSkins,
} from '@playora/ui/lib/game-theme';
import type {
  TapRaceAction,
  TapRaceConfig,
  TapRacePlayerView,
  TapRaceScreenView,
} from './registry';

function toUiSkin(skin?: string): UiSkin {
  if (skin && (uiSkins as readonly string[]).includes(skin)) {
    return skin as UiSkin;
  }
  return 'yep';
}

function toBrandTheme(brand: BrandKit, trackColor?: string): BrandKitTheme {
  return {
    primary: brand.colors.primary,
    accent: brand.colors.accent ?? brand.colors.secondary ?? trackColor,
    background: brand.colors.background,
    text: brand.colors.text,
    fontDisplay: brand.fontHeading,
  };
}

export function TapRacePlayer({
  config,
  brand,
  assets,
  skin,
  status,
  state,
  clock,
  locale,
  player,
  send,
}: PlayerProps<TapRaceConfig, TapRacePlayerView, TapRaceAction>) {
  const title = resolveLocalizedText(config.copy?.title, locale) || 'Đua chạm tốc độ';
  const cta = resolveLocalizedText(config.copy?.cta, locale) || 'Chạm liên tục để bứt tốc!';
  const runnerUrl = assets.url('runner') ?? config.runnerSprite;
  const sponsorUrl = assets.url('sponsorLogo') ?? brand.logoUrl;
  const remainingSec =
    state?.endsAt != null ? Math.max(0, (state.endsAt - clock.now()) / 1000) : config.durationSec;
  const isPlaying = status === 'playing';

  return (
    <GameRoot
      skin={toUiSkin(skin)}
      brand={toBrandTheme(brand, config.trackColor)}
      data-testid="tap-race-player"
      className="flex min-h-dvh flex-col"
    >
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-between gap-4 p-6 text-center select-none">
        <header className="flex w-full flex-col items-center gap-2">
          {sponsorUrl && (
            <img
              src={sponsorUrl}
              alt="Logo"
              className="h-8 w-auto object-contain"
              data-testid="tap-race-sponsor-logo"
            />
          )}
          <h1 className="font-game text-2xl font-bold text-balance" data-testid="tap-race-title">
            {title}
          </h1>
          <p className="text-sm text-game-muted" data-testid="tap-race-cta">
            {cta}
          </p>
        </header>

        <section className="flex flex-col items-center gap-3">
          {runnerUrl && (
            <img
              src={runnerUrl}
              alt="Runner"
              className="size-16 object-contain"
              data-testid="tap-race-runner"
            />
          )}
          <div className="text-3xl" data-testid="tap-race-timer">
            {isPlaying ? (
              <Countdown seconds={remainingSec} />
            ) : (
              <span className="font-game text-lg font-semibold text-game-muted">
                {status === 'result'
                  ? locale === 'en'
                    ? 'Finished!'
                    : 'Kết thúc!'
                  : locale === 'en'
                    ? 'Ready'
                    : 'Sẵn sàng'}
              </span>
            )}
          </div>
          <p
            key={state?.score ?? 0}
            data-testid="tap-race-score"
            className="animate-score-pop font-game text-6xl font-extrabold tabular-nums"
          >
            {state?.score ?? 0}
          </p>
          <p className="text-sm text-game-muted" data-testid="tap-race-stats">
            {locale === 'en' ? 'Rank' : 'Hạng'} #{state?.rank ?? '-'}
            {config.mode === 'team' && (
              <>
                {' · '}
                {player?.team ?? (locale === 'en' ? 'Team' : 'Đội')}: {state?.teamScore ?? 0}
              </>
            )}
          </p>
        </section>

        <GameButton
          size="tap"
          type="button"
          data-testid="tap-race-tap-button"
          disabled={!isPlaying}
          onClick={() => send({ d: 1 })}
        >
          {locale === 'en' ? 'TAP!' : 'CHẠM!'}
        </GameButton>
      </main>
    </GameRoot>
  );
}

export function TapRaceScreen({
  config,
  brand,
  assets,
  skin,
  status,
  state,
  clock,
  locale,
}: ScreenProps<TapRaceConfig, TapRaceScreenView>) {
  const title = resolveLocalizedText(config.copy?.title, locale) || 'Đua chạm tốc độ';
  const cta = resolveLocalizedText(config.copy?.cta, locale) || 'Chạm liên tục để bứt tốc!';
  const bgUrl = assets.url('background');
  const runnerUrl = assets.url('runner') ?? config.runnerSprite;
  const remainingSec =
    state?.endsAt != null ? Math.max(0, (state.endsAt - clock.now()) / 1000) : config.durationSec;
  const teams = state?.teams ?? [];
  const maxTeamScore = Math.max(1, ...teams.map((t) => t.score));
  const entries = (state?.top ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    score: r.score,
    meta: config.mode === 'team' ? r.team : undefined,
  }));

  return (
    <Stage
      fit="container"
      skin={toUiSkin(skin)}
      brand={toBrandTheme(brand, config.trackColor)}
      data-testid="tap-race-screen"
      style={
        bgUrl
          ? {
              backgroundImage: `url(${bgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      className="grid grid-cols-[2fr_3fr] gap-[4cqw]"
    >
      <section className="flex min-w-0 flex-col gap-[2cqh]">
        <div className="flex items-center gap-[1.5cqw]">
          {runnerUrl && (
            <img
              src={runnerUrl}
              alt="Runner"
              className="size-[6cqh] object-contain"
              data-testid="tap-race-screen-runner"
            />
          )}
          <div className="min-w-0">
            <h1
              className="font-display text-stage-xl font-bold truncate"
              data-testid="tap-race-screen-title"
            >
              {title}
            </h1>
            <p className="text-stage-sm text-game-muted truncate" data-testid="tap-race-screen-cta">
              {cta}
            </p>
          </div>
        </div>

        <p className="text-stage-sm text-game-muted">
          {state?.online ?? 0} {locale === 'en' ? 'players online' : 'người đang chơi'}
        </p>

        <div className="text-stage-hero" data-testid="tap-race-screen-timer">
          {status === 'playing' ? (
            <Countdown seconds={remainingSec} />
          ) : (
            <span className="font-display text-stage-2xl font-extrabold">
              {status === 'result'
                ? locale === 'en'
                  ? 'Finished'
                  : 'Kết thúc'
                : locale === 'en'
                  ? 'Ready'
                  : 'Sẵn sàng'}
            </span>
          )}
        </div>

        {config.mode === 'team' && teams.length > 0 && (
          <div className="mt-auto grid gap-[1.5cqh] text-stage-base" data-testid="tap-race-teams">
            {teams.map((t, i) => (
              <TeamBar
                key={t.team}
                name={t.team}
                score={t.score}
                max={maxTeamScore}
                team={i + 1}
                leading={t.score > 0 && t.score === maxTeamScore}
              />
            ))}
          </div>
        )}
      </section>

      <Leaderboard
        data-testid="tap-race-leaderboard"
        className="content-start text-stage-lg"
        entries={entries}
      />
    </Stage>
  );
}

export function TapRaceHostPanel(
  _props: HostPanelProps<TapRaceConfig, TapRaceScreenView, TapRaceAction>,
) {
  return null;
}
