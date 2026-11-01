'use client';

import { Modal } from '@playora/ui/components';
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
    <Modal
      isOpen={open}
      onOpenChange={(v) => {
        if (!v) onClose?.();
      }}
    >
      <Modal.Backdrop isDismissable>
        <Modal.Container size="sm">
          <Modal.Dialog className="max-w-[360px] text-center">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
              <p className="mt-1 text-caption-1-regular text-muted">{hint}</p>
            </Modal.Header>
            <Modal.Body>
              <div
                ref={containerRef}
                data-testid="turnstile-container"
                className="flex min-h-[65px] w-full items-center justify-center py-2"
              />
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export const TurnstileModal = forwardRef(TurnstileModalComponent);
