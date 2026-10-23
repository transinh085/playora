import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode, type guestsApi, type RouteArgs } from '@playora/contracts';
import { AuditService } from '../../common/audit/audit.service';
import type { Actor } from '../events/events.service';
import {
  mapAndValidateRows,
  parseGuestFile,
  suggestColumnMapping,
  type ValidatedGuestRow,
} from './guest-file.parser';
import { GuestsRepository } from './guests.repository';

type ListQuery = RouteArgs<typeof guestsApi.list>['query'];
type PreviewBody = RouteArgs<typeof guestsApi.preview>['body'];
type ImportBody = RouteArgs<typeof guestsApi.import>['body'];
type AssignTeamsBody = RouteArgs<typeof guestsApi.assignTeams>['body'];

/** Cryptographically unbiased Fisher-Yates shuffle. */
function shuffleInPlace<T>(items: T[]): T[] {
  const randomWords = new Uint32Array(items.length);
  crypto.getRandomValues(randomWords);
  for (let i = items.length - 1; i > 0; i--) {
    const word = randomWords[i] ?? 0;
    const j = word % (i + 1);
    const current = items[i];
    const target = items[j];
    if (current !== undefined && target !== undefined) {
      items[i] = target;
      items[j] = current;
    }
  }
  return items;
}

@Injectable()
export class GuestsService {
  constructor(
    private readonly repo: GuestsRepository,
    private readonly audit: AuditService,
  ) {}

  private async ensureEvent(orgId: string, eventId: string) {
    const exists = await this.repo.eventExists(orgId, eventId);
    if (!exists) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    }
  }

  async list(orgId: string, eventId: string, query: ListQuery) {
    await this.ensureEvent(orgId, eventId);
    return this.repo.list(orgId, eventId, query);
  }

  async preview(orgId: string, eventId: string, body: PreviewBody) {
    await this.ensureEvent(orgId, eventId);
    const sheet = await parseGuestFile(body.fileName, body.content);
    const suggestedMapping = suggestColumnMapping(sheet.headers);
    const sampleRows = sheet.rows.slice(0, 5).map(({ cells }) => {
      const record: Record<string, string> = {};
      sheet.headers.forEach((header, idx) => {
        if (header !== '') {
          record[header] = cells[idx] ?? '';
        }
      });
      return record;
    });

    return {
      headers: sheet.headers,
      sampleRows,
      totalRows: sheet.rows.length,
      suggestedMapping,
    };
  }

  async import(orgId: string, eventId: string, body: ImportBody, actor: Actor) {
    await this.ensureEvent(orgId, eventId);
    const sheet = await parseGuestFile(body.fileName, body.content);
    const { validRows, skipped, errors } = mapAndValidateRows(sheet, body.mapping);

    return this.repo.transaction(async (tx) => {
      const uniqueCodes = Array.from(new Set(validRows.map((r) => r.externalCode)));
      const existingCodes = await this.repo.findExistingCodes(orgId, eventId, uniqueCodes, tx);

      const seenCodes = new Set(existingCodes);
      const upsertsByCode = new Map<string, ValidatedGuestRow>();
      let inserted = 0;
      let updated = 0;

      for (const row of validRows) {
        if (seenCodes.has(row.externalCode)) {
          updated++;
        } else {
          inserted++;
          seenCodes.add(row.externalCode);
        }
        upsertsByCode.set(row.externalCode, row);
      }

      if (upsertsByCode.size > 0) {
        await this.repo.upsertBatch(orgId, eventId, Array.from(upsertsByCode.values()), tx);
      }

      await this.audit.record(
        {
          organizationId: orgId,
          actorType: 'user',
          actorId: actor.userId,
          action: 'guests.import',
          targetType: 'event',
          targetId: eventId,
          diff: { fileName: body.fileName, inserted, updated, skipped },
          ip: actor.ip,
        },
        tx,
      );

      return { inserted, updated, skipped, errors };
    });
  }

  async remove(orgId: string, eventId: string, guestId: string) {
    await this.ensureEvent(orgId, eventId);
    const removed = await this.repo.deleteOne(orgId, eventId, guestId);
    if (!removed) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Guest not found' });
    }
    return { ok: true as const };
  }

  async clear(orgId: string, eventId: string, actor: Actor) {
    await this.ensureEvent(orgId, eventId);
    const deleted = await this.repo.transaction(async (tx) => {
      const count = await this.repo.deleteAll(orgId, eventId, tx);
      await this.audit.record(
        {
          organizationId: orgId,
          actorType: 'user',
          actorId: actor.userId,
          action: 'guests.clear',
          targetType: 'event',
          targetId: eventId,
          diff: { deleted: count },
          ip: actor.ip,
        },
        tx,
      );
      return count;
    });
    return { ok: true as const, deleted };
  }

  async listTeams(orgId: string, eventId: string) {
    await this.ensureEvent(orgId, eventId);
    return this.repo.listTeams(orgId, eventId);
  }

  async assignTeams(orgId: string, eventId: string, body: AssignTeamsBody, actor: Actor) {
    await this.ensureEvent(orgId, eventId);

    return this.repo.transaction(async (tx) => {
      const current = await this.repo.listTeams(orgId, eventId, tx);
      const unassignedIds = await this.repo.findUnassignedIds(orgId, eventId, tx);

      if (unassignedIds.length > 0) {
        const shuffledGuestIds = shuffleInPlace([...unassignedIds]);
        const targetTeams = shuffleInPlace([...body.teams]);

        const existingMap = new Map(current.items.map((item) => [item.team, item.count]));
        const counts = new Map<string, number>();
        const buckets = new Map<string, string[]>();

        for (const team of targetTeams) {
          counts.set(team, existingMap.get(team) ?? 0);
          buckets.set(team, []);
        }

        const firstTeam = targetTeams[0];
        if (firstTeam) {
          for (const guestId of shuffledGuestIds) {
            let chosenTeam = firstTeam;
            let minCount = counts.get(chosenTeam) ?? 0;
            for (const candidate of targetTeams) {
              const candidateCount = counts.get(candidate) ?? 0;
              if (candidateCount < minCount) {
                chosenTeam = candidate;
                minCount = candidateCount;
              }
            }
            buckets.get(chosenTeam)?.push(guestId);
            counts.set(chosenTeam, minCount + 1);
          }
        }

        for (const [team, guestIds] of buckets.entries()) {
          if (guestIds.length > 0) {
            await this.repo.assignTeamToIds(orgId, eventId, guestIds, team, tx);
          }
        }

        await this.audit.record(
          {
            organizationId: orgId,
            actorType: 'user',
            actorId: actor.userId,
            action: 'guests.assign_teams',
            targetType: 'event',
            targetId: eventId,
            diff: { assigned: unassignedIds.length, teams: body.teams },
            ip: actor.ip,
          },
          tx,
        );
      }

      const updated = await this.repo.listTeams(orgId, eventId, tx);
      return {
        assigned: unassignedIds.length,
        teams: updated.items,
      };
    });
  }
}
