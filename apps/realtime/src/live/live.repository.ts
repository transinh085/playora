import { Inject, Injectable, Logger } from '@nestjs/common';
import type { RoundResultPayload, RoundStatus } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DB } from '../tokens';

const { events, eventScreens, games, gameVersions, liveRounds, players, roundScores } = schema;

export const SCORE_INSERT_CHUNK_SIZE = 1_000;

/**
 * Tenant-isolated data access for `apps/realtime`.
 * Every query filters by `organizationId` (from verified token claims or screen row).
 */
@Injectable()
export class LiveRepository {
  private readonly logger = new Logger(LiveRepository.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async findActiveScreenByKeyHash(eventId: string, screenKeyHash: string) {
    const [row] = await this.db
      .select({
        id: eventScreens.id,
        organizationId: eventScreens.organizationId,
        eventId: eventScreens.eventId,
      })
      .from(eventScreens)
      .where(
        and(
          eq(eventScreens.eventId, eventId),
          eq(eventScreens.screenKeyHash, screenKeyHash),
          isNull(eventScreens.revokedAt),
        ),
      );
    return row;
  }

  async findEvent(organizationId: string, eventId: string) {
    const [row] = await this.db
      .select({
        id: events.id,
        organizationId: events.organizationId,
        status: events.status,
        playerLimit: events.playerLimit,
      })
      .from(events)
      .where(
        and(
          eq(events.organizationId, organizationId),
          eq(events.id, eventId),
          isNull(events.deletedAt),
        ),
      );
    return row;
  }

  async findGameWithPublishedVersion(organizationId: string, eventId: string, gameId: string) {
    const [game] = await this.db
      .select()
      .from(games)
      .where(
        and(
          eq(games.organizationId, organizationId),
          eq(games.eventId, eventId),
          eq(games.id, gameId),
          isNull(games.deletedAt),
        ),
      );
    if (!game) {
      return { status: 'not_found' as const };
    }
    if (!game.currentVersionId || game.status === 'disabled') {
      return { status: 'not_published' as const };
    }

    const [version] = await this.db
      .select()
      .from(gameVersions)
      .where(
        and(
          eq(gameVersions.organizationId, organizationId),
          eq(gameVersions.gameId, game.id),
          eq(gameVersions.id, game.currentVersionId),
        ),
      );
    if (!version) {
      return { status: 'not_published' as const };
    }
    return { status: 'ok' as const, game, version };
  }

  async insertLiveRound(
    organizationId: string,
    data: {
      id: string;
      eventId: string;
      gameId: string;
      gameVersionId: string;
      env: 'live' | 'rehearsal';
      status: RoundStatus;
    },
  ) {
    return this.db.transaction(async (tx) => {
      const [seqRow] = await tx
        .select({
          nextSeq: sql<number>`coalesce(max(${liveRounds.seq}), 0) + 1`,
        })
        .from(liveRounds)
        .where(
          and(
            eq(liveRounds.organizationId, organizationId),
            eq(liveRounds.eventId, data.eventId),
            eq(liveRounds.env, data.env),
          ),
        );
      const seq = Number(seqRow?.nextSeq ?? 1);
      const [inserted] = await tx
        .insert(liveRounds)
        .values({
          id: data.id,
          organizationId,
          eventId: data.eventId,
          gameId: data.gameId,
          gameVersionId: data.gameVersionId,
          env: data.env,
          seq,
          status: data.status,
        })
        .returning();
      return inserted;
    });
  }

  async updateLiveRoundStatus(
    organizationId: string,
    roundId: string,
    status: RoundStatus,
    extra: { startedAt?: Date; endedAt?: Date } = {},
  ) {
    await this.db
      .update(liveRounds)
      .set({
        status,
        ...(extra.startedAt ? { startedAt: extra.startedAt } : {}),
        ...(extra.endedAt ? { endedAt: extra.endedAt } : {}),
      })
      .where(and(eq(liveRounds.organizationId, organizationId), eq(liveRounds.id, roundId)));
  }

  async finalizeLiveRound(
    organizationId: string,
    params: {
      roundId: string;
      eventId: string;
      endedAt: Date;
      result: RoundResultPayload;
    },
  ) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(liveRounds)
        .set({
          status: 'result',
          endedAt: params.endedAt,
          result: {
            roundId: params.result.roundId,
            ranking: params.result.ranking,
            ...(params.result.teams ? { teams: params.result.teams } : {}),
          },
        })
        .where(
          and(eq(liveRounds.organizationId, organizationId), eq(liveRounds.id, params.roundId)),
        );

      if (params.result.ranking.length > 0) {
        const existingPlayerIds = new Set<string>();
        const allPlayerIds = params.result.ranking.map((r) => r.playerId);
        for (let i = 0; i < allPlayerIds.length; i += SCORE_INSERT_CHUNK_SIZE) {
          const chunkIds = allPlayerIds.slice(i, i + SCORE_INSERT_CHUNK_SIZE);
          if (chunkIds.length === 0) continue;
          const rows = await tx
            .select({ id: players.id })
            .from(players)
            .where(
              and(
                eq(players.organizationId, organizationId),
                eq(players.eventId, params.eventId),
                inArray(players.id, chunkIds),
              ),
            );
          for (const row of rows) {
            existingPlayerIds.add(row.id);
          }
        }

        const scoreRows: Array<typeof roundScores.$inferInsert> = [];
        for (let idx = 0; idx < params.result.ranking.length; idx++) {
          const entry = params.result.ranking[idx];
          if (!entry) continue;
          if (!existingPlayerIds.has(entry.playerId)) {
            this.logger.warn(
              `Skipping round_scores row for unknown player ${entry.playerId} (org=${organizationId}, event=${params.eventId}, round=${params.roundId})`,
            );
            continue;
          }
          scoreRows.push({
            roundId: params.roundId,
            playerId: entry.playerId,
            organizationId,
            score: entry.score,
            rank: idx + 1,
            team: entry.team ?? null,
          });
        }

        for (let i = 0; i < scoreRows.length; i += SCORE_INSERT_CHUNK_SIZE) {
          const chunk = scoreRows.slice(i, i + SCORE_INSERT_CHUNK_SIZE);
          if (chunk.length === 0) continue;
          await tx.insert(roundScores).values(chunk).onConflictDoNothing();
        }
      }
    });
  }
}
