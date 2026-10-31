'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'playora:saved_templates:';

export function useSavedTemplates(orgId: string) {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const storageKey = `${STORAGE_PREFIX}${orgId}`;

  // Read initial from localStorage on client mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedIds(new Set(parsed));
        }
      }
    } catch {
      // Ignore localStorage errors (e.g. private browsing mode)
    }
  }, [storageKey]);

  const toggleSave = useCallback(
    (templateId: string) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(templateId)) {
          next.delete(templateId);
        } else {
          next.add(templateId);
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey],
  );

  const isSaved = useCallback((templateId: string) => savedIds.has(templateId), [savedIds]);

  return {
    savedIds,
    savedCount: savedIds.size,
    toggleSave,
    isSaved,
  };
}
