'use client';

import { AlertDialog, Button, Chip, Separator, Tooltip, toast } from '@playora/ui/components';
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
            <Tooltip delay={150}>
              <Tooltip.Trigger>
                <Link
                  href={`/orgs/${orgId}/campaigns` as Route}
                  aria-label={t('back')}
                  className="inline-flex size-8 items-center justify-center rounded-full text-button-ghost-foreground hover:bg-button-ghost-hover"
                >
                  <ArrowLeft className="size-4" />
                </Link>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('back')}</Tooltip.Content>
            </Tooltip>
            <LogoMark className="size-7" aria-hidden />
            <span className="font-semibold text-sm whitespace-nowrap">{t('title')}</span>
            <Chip variant="soft" color="warning" size="sm">
              {t('badge')}
            </Chip>
            <Separator orientation="vertical" className="h-5" />
          </div>
        }
        toolbarEnd={
          <div className="flex items-center gap-1">
            <Tooltip delay={150}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  className="size-8 rounded-full"
                  aria-label={t('reset')}
                  onPress={() => setConfirmResetOpen(true)}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('reset')}</Tooltip.Content>
            </Tooltip>

            <Tooltip delay={150}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  className="size-8 rounded-full"
                  aria-label={t('copyJson')}
                  onPress={async () => {
                    await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
                    toast.success(t('copied'));
                  }}
                >
                  <Braces className="size-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('copyJson')}</Tooltip.Content>
            </Tooltip>
          </div>
        }
      />

      <AlertDialog isOpen={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialog.Backdrop isDismissable>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>{t('reset')}</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-body-2-regular text-text-secondary">{t('resetConfirm')}</p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="secondary" size="sm">
                  Hủy
                </Button>
                <Button
                  slot="close"
                  variant="danger"
                  size="sm"
                  onPress={() => {
                    setDoc(createDemoDoc());
                    setConfirmResetOpen(false);
                  }}
                >
                  Đồng ý
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
