import type { Route } from 'next';
import { PLAY_URL } from '@/lib/env';
import { buildPlayerLink } from './channels';

/**
 * Every Studio URL of a campaign in one place (docs/product/specs/studio-ux.md §3). Campaign pages live in the app shell;
 * the editor and the rehearsal preview are full screen, while live plays open in `apps/play` (`PLAY_URL/{slug}`).
 */
export function campaignRoutes(orgId: string) {
  const base = `/orgs/${orgId}`;
  return {
    list: `${base}/campaigns` as Route,
    create: `${base}/campaigns/new` as Route,
    templates: `${base}/templates` as Route,
    detail: (id: string) => `${base}/campaigns/${id}` as Route,
    report: (id: string) => `${base}/campaigns/${id}/report` as Route,
    /** `mode` opens a given editor mode, e.g. `rules` from the prizes tab. */
    edit: (id: string, mode?: 'quick' | 'customize' | 'rules') =>
      `${base}/campaigns/${id}/edit${mode ? `?mode=${mode}` : ''}` as Route,
    /** Standalone player app (`http://localhost:3002/{slug}`) for published campaigns. */
    play: (slug: string, channelKey?: string) => buildPlayerLink(PLAY_URL, slug, channelKey),
    /** Full-screen rehearsal / preview in Studio with phone bezel & toolbar. */
    preview: (id: string) => `${base}/campaigns/${id}/preview` as Route,
    rehearsal: (id: string) => `${base}/campaigns/${id}/preview` as Route,
    redeem: `${base}/redeem` as Route,
    share: (id: string) => `${base}/campaigns/${id}/share` as Route,
    sharePrint: (id: string, query?: { ch?: string; format?: 'standee' | 'tent' }) => {
      const q = new URLSearchParams();
      if (query?.ch) q.set('ch', query.ch);
      if (query?.format) q.set('format', query.format);
      const qs = q.toString();
      return `${base}/campaigns/${id}/share/print${qs ? `?${qs}` : ''}` as Route;
    },
  };
}
