import { cn } from '@playora/ui/lib/utils';
import * as React from 'react';

/**
 * "How to join" block for the idle/lobby screen: QR (passed in, so this package has no QR
 * dependency), the short URL and a numeric code people can type when the QR is too far away.
 */
function JoinPanel({
  qr,
  url,
  code,
  className,
  ...props
}: React.ComponentProps<'div'> & { qr?: React.ReactNode; url: string; code?: string }) {
  return (
    <div
      data-slot="join-panel"
      className={cn('flex items-center gap-[1.2em]', className)}
      {...props}
    >
      {qr && (
        <div className="aspect-square w-[6em] shrink-0 rounded-[0.4em] bg-white p-[0.35em] [&>*]:size-full">
          {qr}
        </div>
      )}
      <div className="grid min-w-0 gap-[0.3em]">
        <span className="text-[0.7em] text-game-muted">Quét mã hoặc truy cập</span>
        <span className="truncate font-game font-bold">{url}</span>
        {code && (
          <span className="flex items-baseline gap-[0.4em]">
            <span className="text-[0.7em] text-game-muted">Mã tham gia</span>
            <span className="font-game text-[1.4em] font-extrabold tracking-[0.12em] text-game-primary tabular-nums">
              {code}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export { JoinPanel };
