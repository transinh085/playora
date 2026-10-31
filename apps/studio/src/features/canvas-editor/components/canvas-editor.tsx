'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@playora/ui/components/alert-dialog';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Separator } from '@playora/ui/components/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
import { ArrowLeft, Braces, RotateCcw } from '@playora/ui/icons';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
    <TooltipProvider>
      <div className="h-dvh">
        <CanvasWorkspace
          value={doc}
          onChange={setDoc}
          brand={DEMO_BRAND}
          toolbarStart={
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 rounded-full" asChild>
                    <Link href={`/orgs/${orgId}/campaigns` as Route} aria-label={t('back')}>
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('back')}</TooltipContent>
              </Tooltip>
              <LogoMark className="size-7" aria-hidden />
              <span className="font-semibold text-sm whitespace-nowrap">{t('title')}</span>
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
              >
                {t('badge')}
              </Badge>
              <Separator orientation="vertical" className="h-5" />
            </div>
          }
          toolbarEnd={
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full"
                    aria-label={t('reset')}
                    onClick={() => setConfirmResetOpen(true)}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('reset')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full"
                    aria-label={t('copyJson')}
                    onClick={async () => {
                      await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
                      toast.success(t('copied'));
                    }}
                  >
                    <Braces className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('copyJson')}</TooltipContent>
              </Tooltip>
            </div>
          }
        />

        <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
          <AlertDialogContent className="rounded-lg border border-neutral-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-[#0A0A0A]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-semibold">{t('reset')}</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
                {t('resetConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel className="h-8 rounded-md text-xs">Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="h-8 rounded-md text-xs"
                onClick={() => {
                  setDoc(createDemoDoc());
                  setConfirmResetOpen(false);
                }}
              >
                Đồng ý
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
