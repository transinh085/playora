import journal from '../drizzle/meta/_journal.json';

export interface MigrationInfo {
  tag: string;
  when: number;
}

export function latestMigration(): MigrationInfo | undefined {
  const entries = journal?.entries;
  if (!entries || entries.length === 0) return undefined;
  const latest = entries[entries.length - 1];
  return latest ? { tag: latest.tag, when: latest.when } : undefined;
}
