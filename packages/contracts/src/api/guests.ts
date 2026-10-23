import { z } from 'zod';
import { AuthId, Id, IsoDateTime, Ok, OrgParams, Page, PageQuery } from './common';
import { defineRoute } from './route';

export const MAX_GUEST_IMPORT_ROWS = 50_000;
export const MAX_GUEST_IMPORT_COLUMNS = 50;
export const MAX_GUEST_FILE_BYTES = 10 * 1024 * 1024;
export const UNASSIGNED_TEAM_FILTER = '__unassigned__';

export const GuestFileEncoding = z.enum(['text', 'base64']);
export type GuestFileEncoding = z.infer<typeof GuestFileEncoding>;

export const GuestEntry = z.object({
  id: Id,
  organizationId: AuthId,
  eventId: Id,
  externalCode: z.string(),
  displayName: z.string(),
  team: z.string().nullable(),
  attributes: z.record(z.string(), z.string()),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type GuestEntry = z.infer<typeof GuestEntry>;

export const ListGuestsQuery = PageQuery.extend({
  search: z.string().trim().max(120).optional(),
  team: z.string().trim().max(120).optional(),
});
export type ListGuestsQuery = z.input<typeof ListGuestsQuery>;

export const GuestColumnMapping = z.object({
  externalCode: z.string().trim().min(1).max(120),
  displayName: z.string().trim().min(1).max(120),
  team: z.string().trim().max(120).optional(),
});
export type GuestColumnMapping = z.infer<typeof GuestColumnMapping>;

export const PreviewGuestsBody = z.object({
  fileName: z.string().trim().min(1).max(255),
  /** Raw CSV text (`encoding: 'text'`) or base64-encoded CSV/XLSX content (`encoding: 'base64'`). Multi-sheet XLSX workbooks use the first worksheet. */
  content: z.string().min(1),
  encoding: z.enum(['text', 'base64']),
});
export type PreviewGuestsBody = z.input<typeof PreviewGuestsBody>;

export const PreviewGuestsResponse = z.object({
  headers: z.array(z.string()),
  sampleRows: z.array(z.record(z.string(), z.string())),
  totalRows: z.number().int().nonnegative(),
  suggestedMapping: GuestColumnMapping,
});
export type PreviewGuestsResponse = z.infer<typeof PreviewGuestsResponse>;

export const ImportGuestsBody = z.object({
  fileName: z.string().trim().min(1).max(255),
  /** Raw CSV text (`encoding: 'text'`) or base64-encoded CSV/XLSX content (`encoding: 'base64'`). Multi-sheet XLSX workbooks use the first worksheet. */
  content: z.string().min(1),
  encoding: z.enum(['text', 'base64']),
  mapping: GuestColumnMapping.default({
    externalCode: 'externalCode',
    displayName: 'displayName',
    team: 'team',
  }),
});
export type ImportGuestsBody = z.input<typeof ImportGuestsBody>;

export const GuestImportRowError = z.object({
  row: z.number().int().positive(),
  message: z.string(),
});
export type GuestImportRowError = z.infer<typeof GuestImportRowError>;

export const ImportGuestsResult = z.object({
  inserted: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(GuestImportRowError),
});
export type ImportGuestsResult = z.infer<typeof ImportGuestsResult>;

export const DeleteAllGuestsResult = z.object({
  ok: z.literal(true),
  deleted: z.number().int().nonnegative(),
});
export type DeleteAllGuestsResult = z.infer<typeof DeleteAllGuestsResult>;

export const GuestTeamCount = z.object({
  team: z.string(),
  count: z.number().int().nonnegative(),
});
export type GuestTeamCount = z.infer<typeof GuestTeamCount>;

export const GuestTeamsResponse = z.object({
  items: z.array(GuestTeamCount),
  unassignedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
});
export type GuestTeamsResponse = z.infer<typeof GuestTeamsResponse>;

export const AssignRandomTeamsBody = z
  .object({
    teams: z.array(z.string().trim().min(1).max(120)).min(2).max(100),
  })
  .refine((b) => new Set(b.teams.map((t) => t.toLowerCase())).size === b.teams.length, {
    message: 'Tên các đội không được trùng nhau',
    path: ['teams'],
  });
export type AssignRandomTeamsBody = z.input<typeof AssignRandomTeamsBody>;

export const AssignRandomTeamsResult = z.object({
  assigned: z.number().int().nonnegative(),
  teams: z.array(GuestTeamCount),
});
export type AssignRandomTeamsResult = z.infer<typeof AssignRandomTeamsResult>;

export const JoinQrFormValues = z.object({
  zone: z.string().trim().max(64).optional(),
});
export type JoinQrFormValues = z.input<typeof JoinQrFormValues>;

/** Builds the player join URL `${PLAY_URL}/<eventSlug>` with optional `?t=<table/zone>` (EVT-10). */
export function buildEventJoinUrl(playBaseUrl: string, slug: string, zone?: string): string {
  const base = playBaseUrl.replace(/\/$/, '');
  const url = new URL(`${base}/${encodeURIComponent(slug)}`);
  const trimmedZone = zone?.trim();
  if (trimmedZone) {
    url.searchParams.set('t', trimmedZone);
  }
  return url.toString();
}

const EventParams = OrgParams.extend({ eventId: Id });
const GuestParams = EventParams.extend({ guestId: Id });

export const guestsApi = {
  list: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/events/:eventId/guests',
    summary: 'List guest list entries of an event',
    tags: ['guests'],
    auth: 'session',
    permission: { event: ['read'] },
    params: EventParams,
    query: ListGuestsQuery,
    response: Page(GuestEntry),
  }),
  preview: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/events/:eventId/guests/preview',
    summary: 'Parse headers and sample rows of a CSV/XLSX guest list before importing',
    tags: ['guests'],
    auth: 'session',
    permission: { event: ['update'] },
    params: EventParams,
    body: PreviewGuestsBody,
    response: PreviewGuestsResponse,
  }),
  import: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/events/:eventId/guests/import',
    summary: 'Import guest list entries from CSV or XLSX with column mapping and upsert',
    tags: ['guests'],
    auth: 'session',
    permission: { event: ['update'] },
    params: EventParams,
    body: ImportGuestsBody,
    response: ImportGuestsResult,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/orgs/:orgId/events/:eventId/guests/:guestId',
    summary: 'Delete a single guest list entry',
    tags: ['guests'],
    auth: 'session',
    permission: { event: ['update'] },
    params: GuestParams,
    response: Ok,
  }),
  clear: defineRoute({
    method: 'DELETE',
    path: '/orgs/:orgId/events/:eventId/guests',
    summary: 'Delete all guest list entries of an event',
    tags: ['guests'],
    auth: 'session',
    permission: { event: ['update'] },
    params: EventParams,
    response: DeleteAllGuestsResult,
  }),
  listTeams: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/events/:eventId/guests/teams',
    summary: 'List guest teams with counts',
    tags: ['guests'],
    auth: 'session',
    permission: { event: ['read'] },
    params: EventParams,
    response: GuestTeamsResponse,
  }),
  assignTeams: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/events/:eventId/guests/teams/assign',
    summary: 'Randomly assign balanced teams to unassigned guests',
    tags: ['guests'],
    auth: 'session',
    permission: { event: ['update'] },
    params: EventParams,
    body: AssignRandomTeamsBody,
    response: AssignRandomTeamsResult,
  }),
};
