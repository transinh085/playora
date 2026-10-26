import type { Campaign, PlayRecord, Voucher } from './types';

/**
 * In-browser stand-in for the API's database (docs/plans/2026-10-25-game-builder-plan.md: frontend first, backend later). Lives in
 * localStorage so a refresh, a second tab (the player) and the staff redeem screen share data.
 */
export interface LabDb {
  campaigns: Campaign[];
  plays: PlayRecord[];
  vouchers: Voucher[];
}

const KEY = 'playora.builderLab.v1';
const EMPTY: LabDb = { campaigns: [], plays: [], vouchers: [] };
const listeners = new Set<() => void>();

export function readDb(): LabDb {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as LabDb) } : structuredClone(EMPTY);
  } catch {
    return structuredClone(EMPTY);
  }
}

export function writeDb(db: LabDb) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Quota or private mode: the lab keeps working for this page view only.
  }
  for (const listener of listeners) listener();
}

/** Applies `change` to a fresh copy of the db and saves it. */
export function updateDb<T>(change: (db: LabDb) => T): T {
  const db = readDb();
  const result = change(db);
  writeDb(db);
  return result;
}

/** Notified on local writes and on writes from other tabs. */
export function subscribeDb(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function resetDb() {
  writeDb(structuredClone(EMPTY));
}
