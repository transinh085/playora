'use client';

import { Modal, Typography } from 'antd';
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
        'error-callback': (err) => {
          if (mounted) onError?.(err);
        },
        'expired-callback': () => {
          if (widgetIdRef.current) resetTurnstile(widgetIdRef.current);
        },
      });

      if (id) {
        widgetIdRef.current = id;
      }
    };

    if (isTurnstileReady()) {
      mountTurnstile();
    } else {
      pollId = setInterval(mountTurnstile, 50);
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
      open={open}
      title={title}
      footer={null}
      onCancel={onClose}
      centered
      width={360}
      styles={{
        body: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    >
      <Typography.Text type="secondary" className="text-center text-sm">
        {hint}
      </Typography.Text>
      <div
        ref={containerRef}
        data-testid="turnstile-container"
        style={{
          width: '100%',
          minHeight: 65,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      />
    </Modal>
  );
}

export const TurnstileModal = forwardRef(TurnstileModalComponent);
