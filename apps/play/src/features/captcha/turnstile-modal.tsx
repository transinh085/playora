'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@playora/ui/components/dialog';
import { type ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { isTurnstileReady, removeTurnstile, renderTurnstile, resetTurnstile } from './turnstile';

export interface TurnstileModalHandle {
  reset: () => void;
}

export interface TurnstileModalProps {
  siteKey: string | null;
  open: boolean;
  title: string;
  hint: string;
  onSuccess: (token: string) => void;
  onError?: (err?: string | number) => void;
  onClose?: () => void;
}

function TurnstileModalComponent(
  { siteKey, open, title, hint, onSuccess, onError, onClose }: TurnstileModalProps,
  ref: ForwardedRef<TurnstileModalHandle>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const reset = () => {
    if (widgetIdRef.current) {
      resetTurnstile(widgetIdRef.current);
    }
  };

  useImperativeHandle(ref, () => ({ reset }));

  useEffect(() => {
    if (!open || !siteKey || !containerRef.current) return;

    let mounted = true;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const mountTurnstile = () => {
      if (!mounted || !containerRef.current) return;
      if (!isTurnstileReady()) return;

      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }

      if (widgetIdRef.current) {
        resetTurnstile(widgetIdRef.current);
        return;
      }

      const id = renderTurnstile(containerRef.current, {
        sitekey: siteKey,
        size: 'flexible',
        callback: (token) => {
          if (mounted) onSuccess(token);
        },
        'error-callback': (code) => {
          if (mounted) onError?.(code);
        },
        'expired-callback': () => {
          if (mounted && widgetIdRef.current) resetTurnstile(widgetIdRef.current);
        },
      });
      widgetIdRef.current = id;
    };

    if (isTurnstileReady()) {
      mountTurnstile();
    } else {
      pollId = setInterval(mountTurnstile, 200);
    }

    return () => {
      mounted = false;
      if (pollId) clearInterval(pollId);
      if (widgetIdRef.current) {
        removeTurnstile(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [open, siteKey, onSuccess, onError]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose?.();
      }}
    >
      <DialogContent className="max-w-[360px] rounded-2xl p-6 text-center">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">{hint}</DialogDescription>
        </DialogHeader>
        <div
          ref={containerRef}
          data-testid="turnstile-container"
          className="flex min-h-[65px] w-full items-center justify-center py-2"
        />
      </DialogContent>
    </Dialog>
  );
}

export const TurnstileModal = forwardRef(TurnstileModalComponent);
