import { z } from 'zod';
import { AuthId, Id, IsoDateTime, Ok, OrgParams } from './common';
import { defineRoute } from './route';

export const GameStatus = z.enum(['draft', 'published', 'disabled']);
export type GameStatus = z.infer<typeof GameStatus>;

export const GameSummary = z.object({
  id: Id,
  organizationId: AuthId,
  eventId: Id,
  templateId: z.string(),
  templateKey: z.string(),
  templateVersion: z.string(),
  skinKey: z.string().nullable(),
  name: z.string(),
  draftConfig: z.record(z.string(), z.unknown()),
  hotConfig: z.record(z.string(), z.unknown()),
  assets: z.record(z.string(), z.string()),
  status: GameStatus,
  currentVersionId: Id.nullable(),
  currentVersion: z.number().int().positive().nullable(),
  sortOrder: z.number().int(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type GameSummary = z.infer<typeof GameSummary>;

export const GameVersionSummary = z.object({
  id: Id,
  organizationId: AuthId,
  gameId: Id,
  version: z.number().int().positive(),
  templateId: z.string(),
  templateKey: z.string(),
  templateVersion: z.string(),
  skinKey: z.string().nullable(),
  config: z.record(z.string(), z.unknown()),
  assets: z.record(z.string(), z.string()),
  configHash: z.string(),
  publishedBy: AuthId,
  createdAt: IsoDateTime,
});
export type GameVersionSummary = z.infer<typeof GameVersionSummary>;

export const PublishGameResponse = GameVersionSummary.extend({
  game: GameSummary,
});
export type PublishGameResponse = z.infer<typeof PublishGameResponse>;

export const CreateGameBody = z.object({
  templateId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  skinKey: z.string().trim().min(1).max(64).nullable().optional(),
});
export type CreateGameBody = z.input<typeof CreateGameBody>;

export const UpdateGameBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    skinKey: z.string().trim().min(1).max(64).nullable(),
    draftConfig: z.record(z.string(), z.unknown()),
  })
  .partial();
export type UpdateGameBody = z.input<typeof UpdateGameBody>;

export const ReorderGamesBody = z
  .object({
    gameIds: z.array(Id).min(1).max(200),
  })
  .refine((b) => new Set(b.gameIds).size === b.gameIds.length, {
    message: 'Danh sách trò chơi không được chứa ID trùng lặp',
    path: ['gameIds'],
  });
export type ReorderGamesBody = z.input<typeof ReorderGamesBody>;

const EventParams = OrgParams.extend({ eventId: Id });
const GameParams = OrgParams.extend({ gameId: Id });

export const gamesApi = {
  list: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/events/:eventId/games',
    summary: 'List games of an event ordered by sortOrder',
    tags: ['games'],
    auth: 'session',
    permission: { game: ['read'] },
    params: EventParams,
    response: z.object({ items: z.array(GameSummary) }),
  }),
  create: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/events/:eventId/games',
    summary: 'Create a game instance in an event from a template',
    tags: ['games'],
    auth: 'session',
    permission: { game: ['create'] },
    params: EventParams,
    body: CreateGameBody,
    response: GameSummary,
    status: 201,
  }),
  reorder: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/events/:eventId/games/reorder',
    summary: 'Reorder games of an event',
    tags: ['games'],
    auth: 'session',
    permission: { game: ['update'] },
    params: EventParams,
    body: ReorderGamesBody,
    response: z.object({ items: z.array(GameSummary) }),
  }),
  get: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/games/:gameId',
    summary: 'Get a game',
    tags: ['games'],
    auth: 'session',
    permission: { game: ['read'] },
    params: GameParams,
    response: GameSummary,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/orgs/:orgId/games/:gameId',
    summary: 'Update a game and validate draftConfig against the template schema',
    tags: ['games'],
    auth: 'session',
    permission: { game: ['update'] },
    params: GameParams,
    body: UpdateGameBody,
    response: GameSummary,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/orgs/:orgId/games/:gameId',
    summary: 'Soft-delete a game',
    tags: ['games'],
    auth: 'session',
    permission: { game: ['delete'] },
    params: GameParams,
    response: Ok,
  }),
  publish: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/games/:gameId/publish',
    summary: 'Publish an immutable game version from the current draft config',
    tags: ['games'],
    auth: 'session',
    permission: { game: ['publish'] },
    params: GameParams,
    response: PublishGameResponse,
  }),
  listVersions: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/games/:gameId/versions',
    summary: 'List immutable published versions of a game',
    tags: ['games'],
    auth: 'session',
    permission: { game: ['read'] },
    params: GameParams,
    response: z.object({ items: z.array(GameVersionSummary) }),
  }),
};
