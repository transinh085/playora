'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { AlertDialog } from '@playora/ui/components/base/modal/modal';
import { toast } from '@playora/ui/components/base/toast/toast';
import { Tooltip, TooltipTrigger } from '@playora/ui/components/base/tooltip/tooltip';
import { ArrowLeft, Braces, RotateCcw } from '@playora/ui/icons';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LogoMark } from '@/components/logo';
import { type CanvasDoc, createDemoDoc, DEMO_BRAND } from '../lib/model';
import { CanvasWorkspace } from './canvas-workspace';

const STORAGE_KEY = 'playora.canvasLab.v1';

function loadDoc(): CanvasDoc {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CanvasDoc;
  } catch {
    // Private mode or corrupt data: fall back to the template.
  }
  return createDemoDoc();
}

/** ADR-014 prototype: free canvas editor for game screens, local data only. */
export function CanvasEditor({ orgId }: { orgId: string }) {
  const t = useTranslations('canvasLab');
  const [doc, setDoc] = useState<CanvasDoc>(createDemoDoc);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Load the saved draft after hydration (localStorage is browser-only).
  useEffect(() => {
    setDoc(loadDoc());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      } catch {
        // Saving is a convenience only.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [doc]);

  return (
    <div className="h-dvh">
      <CanvasWorkspace
        value={doc}
        onChange={setDoc}
        brand={DEMO_BRAND}
        toolbarStart={
          <div className="flex items-center gap-2">
            <TooltipTrigger>
              <Link
                href={`/orgs/${orgId}/campaigns` as Route}
                aria-label={t('back')}
                className="inline-flex size-8 items-center justify-center rounded-full text-button-ghost-foreground hover:bg-button-ghost-hover"
              >
                <ArrowLeft className="size-4" />
              </Link>
              <Tooltip>{t('back')}</Tooltip>
            </TooltipTrigger>
            <LogoMark className="size-7" aria-hidden />
            <span className="font-semibold text-sm whitespace-nowrap">{t('title')}</span>
            <Chip variant="caption" color="yellow">
              {t('badge')}
            </Chip>
            <div className="h-5 w-px bg-separator-border" aria-hidden="true" />
          </div>
        }
        toolbarEnd={
          <div className="flex items-center gap-1">
            <TooltipTrigger>
              <Button
                type="button"
                variant="ghost"
                size="small"
                className="size-8 rounded-full p-0"
                aria-label={t('reset')}
                onClick={() => setConfirmResetOpen(true)}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Tooltip>{t('reset')}</Tooltip>
            </TooltipTrigger>

            <TooltipTrigger>
              <Button
                type="button"
                variant="ghost"
                size="small"
                className="size-8 rounded-full p-0"
                aria-label={t('copyJson')}
                onClick={async () => {
                  await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
                  toast.success(t('copied'));
                }}
              >
                <Braces className="size-4" />
              </Button>
              <Tooltip>{t('copyJson')}</Tooltip>
            </TooltipTrigger>
          </div>
        }
      />

      <AlertDialog
        isOpen={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title={t('reset')}
        description={t('resetConfirm')}
        cancelLabel="Hủy"
        confirmLabel="Đồng ý"
        onConfirm={() => {
          setDoc(createDemoDoc());
          setConfirmResetOpen(false);
        }}
      />
    </div>
  );
}
