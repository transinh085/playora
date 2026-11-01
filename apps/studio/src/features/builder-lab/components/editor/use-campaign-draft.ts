'use client';

import { ApiError } from '@playora/api-client';
import { toast } from '@playora/ui/components';
import { applyApiError, type FormErrorTarget } from '@playora/ui/form';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Campaign, useUpdateCampaign } from '../../api';

export type DraftPatch = Partial<
  Pick<Campaign, 'name' | 'skinKey' | 'brand' | 'screens' | 'prizes' | 'rules' | 'compliance'>
>;
export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 800;
export const MAX_DRAFT_HISTORY = 50;

export interface DraftHistoryState {
  current: Campaign | null;
  past: Campaign[];
  future: Campaign[];
}

export function pushDraftSnapshot(state: DraftHistoryState, patch: DraftPatch): DraftHistoryState {
  if (!state.current) return state;
  const next = { ...state.current, ...patch };
  return {
    current: next,
    past: [...state.past.slice(-(MAX_DRAFT_HISTORY - 1)), state.current],
    future: [],
  };
}

export function undoDraftSnapshot(state: DraftHistoryState): DraftHistoryState {
  if (!state.current || state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  if (!previous) return state;
  return {
    current: previous,
    past: state.past.slice(0, -1),
    future: [...state.future.slice(-(MAX_DRAFT_HISTORY - 1)), state.current],
  };
}

export function redoDraftSnapshot(state: DraftHistoryState): DraftHistoryState {
  if (!state.current || state.future.length === 0) return state;
  const next = state.future[state.future.length - 1];
  if (!next) return state;
  return {
    current: next,
    past: [...state.past.slice(-(MAX_DRAFT_HISTORY - 1)), state.current],
    future: state.future.slice(0, -1),
  };
}

function toFullPatch(campaign: Campaign): DraftPatch {
  return {
    name: campaign.name,
    skinKey: campaign.skinKey,
    brand: campaign.brand,
    screens: campaign.screens,
    prizes: campaign.prizes,
    rules: campaign.rules,
    compliance: campaign.compliance,
  };
}

/**
 * Local working copy of a campaign with debounced autosave (800ms) and draft-level Undo/Redo
 * across Quick Edit, Customize and Rules & Prizes (BLD-14). The draft is seeded once from
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
  const [history, setHistory] = useState<DraftHistoryState>({
    current: null,
    past: [],
    future: [],
  });
  const draft = history.current;
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const pending = useRef<DraftPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (server && server.id !== draft?.id) {
      setHistory({ current: server, past: [], future: [] });
    }
  }, [server, draft?.id]);

  useEffect(() => {
    if (saveState !== 'pending' && saveState !== 'saving' && saveState !== 'error') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState]);

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

  const scheduleAutosave = useCallback(
    (patch: DraftPatch) => {
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

  const patchDraft = useCallback(
    (patch: DraftPatch) => {
      setHistory((prev) => pushDraftSnapshot(prev, patch));
      scheduleAutosave(patch);
    },
    [scheduleAutosave],
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      const next = undoDraftSnapshot(prev);
      if (next.current && next.current !== prev.current) {
        scheduleAutosave(toFullPatch(next.current));
      }
      return next;
    });
  }, [scheduleAutosave]);

  const redo = useCallback(() => {
    setHistory((prev) => {
      const next = redoDraftSnapshot(prev);
      if (next.current && next.current !== prev.current) {
        scheduleAutosave(toFullPatch(next.current));
      }
      return next;
    });
  }, [scheduleAutosave]);

  return {
    draft,
    saveState,
    patchDraft,
    flush,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
