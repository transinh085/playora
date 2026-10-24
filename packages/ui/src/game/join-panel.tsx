'use client';

import { cn } from '@playora/ui/lib/utils';
import { Flex, Tag } from 'antd';
import type * as React from 'react';

export type JoinPanelProps = React.ComponentProps<'div'> & {
  qr?: React.ReactNode;
  url: string;
  code?: string;
};

/**
 * "How to join" block for the idle/lobby screen built on Ant Design `Flex` and `Tag`:
 * QR (passed in, so this package has no QR dependency), the short URL and a numeric code.
 */
function JoinPanel({ qr, url, code, className, ...props }: JoinPanelProps) {
  return (
    <Flex data-slot="join-panel" align="center" className={cn('gap-[1.2em]', className)} {...props}>
      {qr && (
        <div className="aspect-square w-[6em] shrink-0 rounded-[0.4em] border border-game-border bg-game-surface p-[0.35em] [&>*]:size-full">
          {qr}
        </div>
      )}
      <div className="grid min-w-0 gap-[0.3em]">
        <span className="text-[0.7em] text-game-muted">Quét mã hoặc truy cập</span>
        <span className="truncate font-game font-bold">{url}</span>
        {code && (
          <span className="flex items-baseline gap-[0.4em]">
            <span className="text-[0.7em] text-game-muted">Mã tham gia</span>
            <Tag
              variant="filled"
              className="m-0 border-0 bg-game-primary/15 px-[0.45em] py-[0.05em] font-game text-[1.4em] font-extrabold tracking-[0.12em] text-game-primary tabular-nums"
              styles={{
                root: {
                  backgroundColor: 'color-mix(in oklch, var(--game-primary) 16%, transparent)',
                  color: 'var(--game-primary)',
                },
              }}
            >
              {code}
            </Tag>
          </span>
        )}
      </div>
    </Flex>
  );
}

export { JoinPanel };
