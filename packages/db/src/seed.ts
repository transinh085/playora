import { randomBytes, scrypt } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createDb } from './client';
import { account, brandKits, events, guestListEntries, member, organization, user } from './schema';

const scryptConfig = { N: 16384, r: 16, p: 1, dkLen: 64 };
function generateKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      scryptConfig.dkLen,
      {
        N: scryptConfig.N,
        r: scryptConfig.r,
        p: scryptConfig.p,
        maxmem: 128 * scryptConfig.N * scryptConfig.r * 2,
      },
      (err, key) => {
        if (err) reject(err);
        else resolve(key);
      },
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await generateKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const { db, sql } = createDb(url, { max: 1 });

const orgId = 'org_demo';
const slug = 'demo-yep';
const devEmail = 'dev@playora.local';
const devPassword = 'password123';
const devUserId = 'user_demo_dev';

await db
  .insert(organization)
  .values({ id: orgId, name: 'Playora Demo Agency', slug: 'demo', createdAt: new Date() })
  .onConflictDoNothing();

const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, devEmail));
const targetUserId = existingUser?.id ?? devUserId;

if (!existingUser) {
  const passwordHash = await hashPassword(devPassword);
  await db.insert(user).values({
    id: devUserId,
    name: 'Playora Dev',
    email: devEmail,
    emailVerified: true,
  });
  await db.insert(account).values({
    id: 'account_demo_dev',
    accountId: devUserId,
    providerId: 'credential',
    userId: devUserId,
    password: passwordHash,
  });
  console.log(`Seeded dev user (${devEmail} / ${devPassword})`);
} else {
  console.log(`Dev user already exists (${devEmail})`);
}

const [existingMember] = await db
  .select({ id: member.id })
  .from(member)
  .where(and(eq(member.organizationId, orgId), eq(member.userId, targetUserId)));

if (!existingMember) {
  await db
    .insert(member)
    .values({
      id: 'member_demo_dev',
      organizationId: orgId,
      userId: targetUserId,
      role: 'owner',
      createdAt: new Date(),
    })
    .onConflictDoNothing();
  console.log(`Added dev user to ${orgId} as owner`);
}

const [existingEvent] = await db
  .select({ id: events.id })
  .from(events)
  .where(eq(events.slug, slug));
if (!existingEvent) {
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
} else {
  console.log(`Already seeded (event "${slug}")`);
}

await sql.end();
