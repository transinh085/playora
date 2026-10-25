import type { Route } from 'next';

/**
 * Every Studio URL of a campaign in one place (docs/16 §3). Campaign pages live in the app shell;
 * the editor and the simulated player are full screen.
 */
export function campaignRoutes(orgId: string) {
  const base = `/orgs/${orgId}`;
  return {
    list: `${base}/campaigns` as Route,
    create: `${base}/campaigns/new` as Route,
    detail: (id: string) => `${base}/campaigns/${id}` as Route,
    /** `mode` opens a given editor mode, e.g. `rules` from the prizes tab. */
    edit: (id: string, mode?: 'quick' | 'customize' | 'rules') =>
      `${base}/campaigns/${id}/edit${mode ? `?mode=${mode}` : ''}` as Route,
    play: (id: string) => `${base}/play/${id}` as Route,
    rehearsal: (id: string) => `${base}/play/${id}?rehearsal=1` as Route,
    redeem: `${base}/redeem` as Route,
  };
}
