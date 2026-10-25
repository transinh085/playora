'use client';

import { App, Button, Divider, Popconfirm, Tag, Tooltip, Typography } from 'antd';
import { ArrowLeft, Braces, RotateCcw } from 'lucide-react';
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
  const { message } = App.useApp();
  const [doc, setDoc] = useState<CanvasDoc>(createDemoDoc);

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
          <>
            <Tooltip title={t('back')}>
              <Link href={`/orgs/${orgId}/events` as Route} aria-label={t('back')}>
                <Button
                  type="text"
                  tabIndex={-1}
                  aria-hidden
                  icon={<ArrowLeft className="size-4" />}
                />
              </Link>
            </Tooltip>
            <LogoMark className="size-7" aria-hidden />
            <Typography.Text strong className="whitespace-nowrap">
              {t('title')}
            </Typography.Text>
            <Tag color="warning" className="!m-0">
              {t('badge')}
            </Tag>
            <Divider orientation="vertical" />
          </>
        }
        toolbarEnd={
          <>
            <Popconfirm title={t('resetConfirm')} onConfirm={() => setDoc(createDemoDoc())}>
              <Tooltip title={t('reset')}>
                <Button
                  type="text"
                  aria-label={t('reset')}
                  icon={<RotateCcw className="size-4" />}
                />
              </Tooltip>
            </Popconfirm>
            <Tooltip title={t('copyJson')}>
              <Button
                type="text"
                aria-label={t('copyJson')}
                icon={<Braces className="size-4" />}
                onClick={async () => {
                  await navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
                  message.success(t('copied'));
                }}
              />
            </Tooltip>
          </>
        }
      />
    </div>
  );
}
