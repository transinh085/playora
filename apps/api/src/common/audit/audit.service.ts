import { Inject, Injectable } from '@nestjs/common';
import { type Database, type DbOrTx, schema } from '@playora/db';
import { DB } from '../../infra/tokens';

export interface AuditEntry {
  organizationId: string | null;
  actorType: 'user' | 'system' | 'admin' | 'api_key';
  actorId: string | null;
  /** `<resource>.<verb>`, e.g. `event.delete`, `draw.spin`, `export.players` */
  action: string;
  targetType?: string;
  targetId?: string;
  diff?: unknown;
  ip?: string;
}

/** Append-only audit trail for sensitive actions (docs/engineering/security.md §1.2). */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async record(entry: AuditEntry, tx: DbOrTx = this.db) {
    await tx.insert(schema.auditLogs).values(entry);
  }
}
