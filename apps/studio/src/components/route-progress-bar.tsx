'use client';

import { cx } from '@playora/ui/utils/cx';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const START_EVENT = 'playora:route-progress-start';
const DONE_EVENT = 'playora:route-progress-done';

/** Programmatically trigger the top route progress bar to start. */
export function startRouteProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(START_EVENT));
  }
}

/** Programmatically complete the top route progress bar. */
export function doneRouteProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DONE_EVENT));
  }
}

/**
 * Global Top Route Progress Bar for Next.js App Router.
 * Smoothly animates across the top of the viewport during route transitions,
 * link clicks, and page loads, providing instant visual feedback.
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }

    setProgress(100);
    setIsFinishing(true);

    cleanupTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      setIsFinishing(false);
    }, 300);
  }, []);

  const start = useCallback(() => {
    clearAllTimers();
    setIsFinishing(false);
    setVisible(true);
    setProgress(15);

    // Trickle progress incrementally towards 85%
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        const diff = (85 - prev) * 0.18;
        return Math.min(85, prev + Math.max(diff, 1.5));
      });
    }, 200);

    // Safety timeout: automatically finish if navigation hangs past 8s
    safetyTimeoutRef.current = setTimeout(() => {
      finish();
    }, 8000);
  }, [clearAllTimers, finish]);

  // Complete progress whenever pathname or searchParams change
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Track pathname and searchParams changes to complete the progress
    void pathname;
    void searchParams;
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    finish();
  }, [pathname, searchParams, finish]);

  // Global listeners for link clicks and custom events
  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      // Ignore right clicks or modified clicks (new tab, new window)
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;

      // Ignore download, target="_blank", mailto/tel, or external links
      if (
        anchor.hasAttribute('download') ||
        anchor.target === '_blank' ||
        anchor.rel?.includes('external')
      ) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
        return;
      }

      // Check if internal navigation to a different URL
      try {
        const dest = new URL(anchor.href, window.location.href);
        const current = new URL(window.location.href);

        // Ignore same URL or external domains
        if (dest.origin !== current.origin) return;
        if (dest.pathname === current.pathname && dest.search === current.search) {
          // If only hash changes, don't show full page progress
          return;
        }

        start();
      } catch {
        // Ignore invalid URLs
      }
    };

    const handleCustomStart = () => start();
    const handleCustomDone = () => finish();

    window.addEventListener('click', handleLinkClick, { capture: true });
    window.addEventListener(START_EVENT, handleCustomStart);
    window.addEventListener(DONE_EVENT, handleCustomDone);

    return () => {
      window.removeEventListener('click', handleLinkClick, { capture: true });
      window.removeEventListener(START_EVENT, handleCustomStart);
      window.removeEventListener(DONE_EVENT, handleCustomDone);
      clearAllTimers();
    };
  }, [start, finish, clearAllTimers]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={cx(
        'pointer-events-none fixed top-0 left-0 right-0 z-[999999] h-[2.5px] overflow-hidden',
        'transition-opacity duration-300 ease-out',
        isFinishing ? 'opacity-0' : 'opacity-100',
      )}
    >
      <div
        className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400 shadow-[0_0_10px_#14b8a6,0_0_5px_#10b981] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  );
}
