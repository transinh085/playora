import { cn } from '@playora/ui/lib/utils';
import { Check } from 'lucide-react';
import * as React from 'react';

/** Quiz answers are identified by colour *and* shape, so they still read for colour-blind players
 *  and on washed-out projectors. The screen and the phone show the same pair for the same answer. */
const SHAPES = [
  <path key="tri" d="M12 3 22 20H2z" />,
  <path key="dia" d="m12 2 10 10-10 10L2 12z" />,
  <circle key="cir" cx="12" cy="12" r="10" />,
  <rect key="sq" x="3" y="3" width="18" height="18" rx="2" />,
];

export type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong' | 'muted';

function AnswerShape({ index, className }: { index: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-7 fill-current', className)}>
      {SHAPES[index % SHAPES.length]}
    </svg>
  );
}

function AnswerTile({
  index,
  state = 'idle',
  interactive = true,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<'button'> & {
  /** 0–3: picks colour (`--team-1…4`) and shape. */
  index: number;
  state?: AnswerState;
  /** false renders a non-focusable tile for the big screen. */
  interactive?: boolean;
}) {
  const classes = cn(
    'relative flex min-h-20 w-full items-center gap-4 rounded-game bg-(--tile) px-5 py-4 text-left font-game text-lg font-bold text-[oklch(0.18_0.04_290)] transition-[opacity,scale,box-shadow] duration-(--duration-base) ease-out outline-none',
    interactive &&
      'touch-manipulation select-none focus-visible:ring-4 focus-visible:ring-game-fg/70 active:scale-[0.98] disabled:pointer-events-none',
    state === 'selected' && 'ring-4 ring-game-fg ring-offset-2 ring-offset-game-bg',
    state === 'correct' && 'ring-4 ring-game-fg',
    (state === 'wrong' || state === 'muted') && 'opacity-35',
    className,
  );
  const content = (
    <>
      <AnswerShape index={index} className="shrink-0 opacity-80" />
      <span className="min-w-0 flex-1 text-balance">{children}</span>
      {state === 'correct' && (
        <Check className="size-7 shrink-0" strokeWidth={3} aria-label="Đúng" />
      )}
    </>
  );
  const tileStyle = { '--tile': `var(--team-${(index % 4) + 1})`, ...style } as React.CSSProperties;

  if (!interactive) {
    return (
      <div data-slot="answer-tile" data-state={state} className={classes} style={tileStyle}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      data-slot="answer-tile"
      data-state={state}
      aria-pressed={state === 'selected'}
      className={classes}
      style={tileStyle}
      {...props}
    >
      {content}
    </button>
  );
}

export { AnswerShape, AnswerTile };
