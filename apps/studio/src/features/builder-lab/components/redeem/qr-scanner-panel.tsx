'use client';

import { Alert, Button } from '@playora/ui/components';
import { QrCode, X } from '@playora/ui/icons';
import { useEffect, useRef, useState } from 'react';
import { Caption } from '@/components/caption';
import { parseScannedRedeemPayload, type ScannedRedeemPayload } from './code';

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

export function QrScannerPanel({
  openLabel,
  closeLabel,
  hintLabel,
  permissionDeniedLabel,
  onScan,
}: {
  openLabel: string;
  closeLabel: string;
  hintLabel: string;
  permissionDeniedLabel: string;
  onScan: (payload: ScannedRedeemPayload) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    let stream: MediaStream | null = null;
    let timerId: number | null = null;

    const startCamera = async () => {
      setCameraError(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError(true);
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!active) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }

        const Detector = window.BarcodeDetector;
        const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;

        const scanTick = async () => {
          if (!active) return;
          const v = videoRef.current;
          if (detector && v && v.readyState >= 2) {
            try {
              const results = await detector.detect(v);
              for (const item of results) {
                const parsed = item.rawValue ? parseScannedRedeemPayload(item.rawValue) : null;
                if (parsed) {
                  setIsOpen(false);
                  onScanRef.current(parsed);
                  return;
                }
              }
            } catch {
              // Ignore frame decode errors
            }
          }
          timerId = window.setTimeout(scanTick, 250);
        };

        timerId = window.setTimeout(scanTick, 250);
      } catch {
        if (active) setCameraError(true);
      }
    };

    void startCamera();

    return () => {
      active = false;
      if (timerId !== null) window.clearTimeout(timerId);
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
      }
    };
  }, [isOpen]);

  return (
    <div className="flex flex-col gap-3" data-testid="qr-scanner-panel">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant={isOpen ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setIsOpen((prev) => !prev)}
          data-testid="toggle-qr-scanner-btn"
        >
          {isOpen ? <X className="size-4" /> : <QrCode className="size-4" />}
          {isOpen ? closeLabel : openLabel}
        </Button>
      </div>

      {isOpen && (
        <div
          className="overflow-hidden rounded-2xl border border-border-button-default bg-neutral-950 p-3 text-white"
          data-testid="qr-scanner-viewport"
        >
          {cameraError ? (
            <Alert status="warning">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{permissionDeniedLabel}</Alert.Title>
              </Alert.Content>
            </Alert>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-2xl border-2 border-teal-400/80 bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  data-testid="qr-scanner-video"
                />
                <div className="pointer-events-none absolute inset-4 rounded-xl border border-dashed border-white/50" />
              </div>
              <Caption className="text-center text-white/80">{hintLabel}</Caption>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
