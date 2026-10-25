'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { updateCampaign } from '../../mock/api';
import { useUpdateCampaign } from '../../mock/hooks';
import type { Campaign } from '../../mock/types';

export type DraftPatch = Partial<
  Pick<Campaign, 'name' | 'skinKey' | 'brand' | 'screens' | 'prizes' | 'rules'>
>;
export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 600;

/**
 * Local working copy of a campaign with debounced autosave. The draft is seeded once from the
 * server copy and then owned by the editor, so a save response never yanks state out from under
 * the canvas (selection, undo history) while the user keeps typing.
 */
export function useCampaignDraft(server: Campaign | undefined) {
  const save = useUpdateCampaign(server?.id ?? '');
  const [draft, setDraft] = useState<Campaign | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const pending = useRef<DraftPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (server && server.id !== draft?.id) setDraft(server);
  }, [server, draft?.id]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setSaveState('saving');
    try {
      await saveRef.current.mutateAsync(patch);
      setSaveState(Object.keys(pending.current).length ? 'pending' : 'saved');
    } catch {
      // Put the patch back so the next edit (or publish) retries it.
      pending.current = { ...patch, ...pending.current };
      setSaveState('error');
    }
  }, []);

  const update = useCallback(
    (patch: DraftPatch) => {
      setDraft((current) => (current ? { ...current, ...patch } : current));
      pending.current = { ...pending.current, ...patch };
      setSaveState('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  // Leaving the editor (route change or closing the tab) saves whatever is still waiting.
  const id = server?.id;
  useEffect(() => {
    if (!id) return;
    // The mock writes storage synchronously when called, so this survives page unload.
    const onHide = () => {
      if (!Object.keys(pending.current).length) return;
      void updateCampaign(id, pending.current);
      pending.current = {};
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      if (timer.current) clearTimeout(timer.current);
      if (Object.keys(pending.current).length) saveRef.current.mutate(pending.current);
      pending.current = {};
    };
  }, [id]);

  return { draft, update, flush, saveState };
}
