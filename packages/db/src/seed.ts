import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createDb } from './client';
import { brandKits, events, guestListEntries, organization } from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const { db, sql } = createDb(url, { max: 1 });

const orgId = 'org_demo';
const slug = 'demo-yep';

const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug));
if (existing) {
  console.log(`Already seeded (event "${slug}")`);
  await sql.end();
  process.exit(0);
}

await db
  .insert(organization)
  .values({ id: orgId, name: 'Playora Demo Agency', slug: 'demo', createdAt: new Date() })
  .onConflictDoNothing();

const [kit] = await db
  .insert(brandKits)
  .values({
    organizationId: orgId,
    name: 'Tết Đinh Mùi',
    tokens: { colors: { primary: '#c8102e', background: '#fff7e6', text: '#3b0a0a' } },
  })
  .returning();

const eventId = uuidv7();
await db.insert(events).values({
  id: eventId,
  organizationId: orgId,
  brandKitId: kit?.id,
  slug,
  name: 'YEP Demo 2026',
  identity: 'guest_list',
  playerLimit: 1000,
});

const teams = ['Kinh doanh', 'Marketing', 'Kỹ thuật', 'Vận hành'];
await db.insert(guestListEntries).values(
  Array.from({ length: 500 }, (_, i) => ({
    organizationId: orgId,
    eventId,
    externalCode: `NV${String(i + 1).padStart(4, '0')}`,
    displayName: `Nhân viên ${i + 1}`,
    team: teams[i % teams.length],
  })),
);

console.log(`Seeded demo org, event "${slug}" and 500 guests`);
await sql.end();
