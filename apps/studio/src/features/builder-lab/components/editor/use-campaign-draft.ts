'use client';

import { ApiError } from '@playora/api-client';
import { toast } from '@playora/ui/components/base/toast/toast';
import { applyApiError, type FormErrorTarget } from '@playora/ui/form';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Campaign, useUpdateCampaign } from '../../api';

export type DraftPatch = Partial<
  Pick<Campaign, 'name' | 'skinKey' | 'brand' | 'screens' | 'prizes' | 'rules' | 'compliance'>
>;
export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 800;

/**
 * Local working copy of a campaign with debounced autosave (800ms). The draft is seeded once from
 * the server copy and then owned by the editor, so a save response never yanks state out from under
 * the canvas (selection, undo history) while the user keeps typing.
 */
export function useCampaignDraft(
  orgId: string,
  server: Campaign | undefined,
  form?: FormErrorTarget,
) {
  const tErrors = useTranslations('errors');
  const save = useUpdateCampaign(orgId, server?.id ?? '');
  const [draft, setDraft] = useState<Campaign | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const pending = useRef<DraftPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (server && server.id !== draft?.id) setDraft(server);
  }, [server, draft?.id]);

  const reportSaveError = useCallback(
    (err: unknown) => {
      const codeMsg = (code: string) =>
        tErrors.has(code as never) ? tErrors(code as never) : code;
      if (form && applyApiError(form, err, codeMsg)) return;
      const collected: string[] = [];
      applyApiError(
        {
          setFields: (fields) => {
            for (const f of fields) {
              if (f.errors?.length) collected.push(...f.errors);
            }
          },
        },
        err,
        codeMsg,
      );
      if (collected[0]) {
        toast.error(collected[0]);
        return;
      }
      if (err instanceof ApiError) {
        toast.error(tErrors.has(err.code) ? tErrors(err.code) : err.message);
        return;
      }
      toast.error(tErrors('INTERNAL'));
    },
    [form, tErrors],
  );

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inflight.current) {
      const prevOk = await inflight.current;
      if (!prevOk && !Object.keys(pending.current).length) return false;
    }
    const patch = pending.current;
    if (!Object.keys(patch).length) return true;
    pending.current = {};
    setSaveState('saving');
    const run = (async () => {
      try {
        await saveRef.current.mutateAsync(patch);
        setSaveState(Object.keys(pending.current).length ? 'pending' : 'saved');
        return true;
      } catch (err) {
        // Put the patch back so the next edit (or publish) retries it.
        pending.current = { ...patch, ...pending.current };
        setSaveState('error');
        reportSaveError(err);
        return false;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, [reportSaveError]);

  const patchDraft = useCallback(
    (patch: DraftPatch) => {
      setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
      pending.current = { ...pending.current, ...patch };
      setSaveState('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, AUTOSAVE_MS);
    },
    [flush],
  );

  return {
    draft,
    saveState,
    patchDraft,
    flush,
  };
}
