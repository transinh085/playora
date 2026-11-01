/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import type { Campaign } from '../../api';
import { buildScreens, defaultPrizes, defaultRules, skinBrand } from '../../lib/starter';
import {
  type DraftHistoryState,
  MAX_DRAFT_HISTORY,
  pushDraftSnapshot,
  redoDraftSnapshot,
  undoDraftSnapshot,
} from './use-campaign-draft';

function makeCampaign(name = 'Test'): Campaign {
  const now = new Date().toISOString();
  return {
    id: 'c1',
    organizationId: 'org1',
    slug: 'test',
    name,
    templateKey: 'spin-wheel',
    skinKey: 'tet',
    brand: skinBrand('tet'),
    screens: buildScreens('spin-wheel', 'tet'),
    prizes: defaultPrizes(),
    rules: defaultRules(),
    status: 'draft',
    phase: 'draft',
    paused: false,
    version: 0,
    publishedAt: null,
    hasUnpublishedChanges: false,
    playbook: null,
    compliance: { promotionType: null, termsText: null, checklistAcknowledgedAt: null },
    updatedAt: now,
    createdAt: now,
  };
}

describe('draft-level undo/redo history (BLD-14)', () => {
  test('undoes and redoes changes across screens, prizes and rules', () => {
    let state: DraftHistoryState = {
      current: makeCampaign('Initial'),
      past: [],
      future: [],
    };

    state = pushDraftSnapshot(state, { name: 'Edited Name' });
    state = pushDraftSnapshot(state, {
      prizes: [{ id: 'p1', name: 'Trà đào', quantity: 50, valueVnd: 20_000 }],
    });
    expect(state.current?.name).toBe('Edited Name');
    expect(state.current?.prizes[0]?.name).toBe('Trà đào');
    expect(state.past).toHaveLength(2);

    state = undoDraftSnapshot(state);
    expect(state.current?.name).toBe('Edited Name');
    expect(state.current?.prizes).toHaveLength(defaultPrizes().length);

    state = undoDraftSnapshot(state);
    expect(state.current?.name).toBe('Initial');
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(2);

    state = redoDraftSnapshot(state);
    expect(state.current?.name).toBe('Edited Name');
  });

  test('bounds history stack at MAX_DRAFT_HISTORY (50) snapshots', () => {
    let state: DraftHistoryState = {
      current: makeCampaign('Step 0'),
      past: [],
      future: [],
    };

    for (let i = 1; i <= 65; i += 1) {
      state = pushDraftSnapshot(state, { name: `Step ${i}` });
    }

    expect(state.past).toHaveLength(MAX_DRAFT_HISTORY);
    expect(state.past[0]?.name).toBe('Step 15');
    expect(state.current?.name).toBe('Step 65');
  });
});
