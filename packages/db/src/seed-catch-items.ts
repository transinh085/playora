import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createDb } from './client';
import {
  brandKits,
  events,
  games,
  gameVersions,
  member,
  organization,
  prizes,
  user,
} from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const { db, sql } = createDb(url, { max: 1 });

const orgId = 'org_demo';
const orgSlug = 'demo';
const eventSlug = 'hung-tra-sua-2d';
const devEmail = 'dev@playora.local';

console.log('🌱 Bắt đầu seeding chiến dịch Game 2D "Hứng Trà Sữa May Mắn"...');

// 1. Ensure Demo Organization exists
await db
  .insert(organization)
  .values({ id: orgId, name: 'Playora Demo Agency', slug: orgSlug, createdAt: new Date() })
  .onConflictDoNothing();

// 2. Find target user
const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, devEmail));
const targetUserId = existingUser?.id ?? 'user_demo_dev';

if (!existingUser) {
  await db
    .insert(user)
    .values({
      id: targetUserId,
      name: 'Playora Dev',
      email: devEmail,
      emailVerified: true,
    })
    .onConflictDoNothing();
}

// 3. Ensure dev member exists
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

// 4. Ensure Brand Kit exists
let [kit] = await db
  .select({ id: brandKits.id })
  .from(brandKits)
  .where(and(eq(brandKits.organizationId, orgId), eq(brandKits.name, 'Trà Sữa O-Tea')));

if (!kit) {
  const [createdKit] = await db
    .insert(brandKits)
    .values({
      organizationId: orgId,
      name: 'Trà Sữa O-Tea',
      tokens: {
        colors: {
          primary: '#F59E0B',
          accent: '#10B981',
          background: '#0F172A',
          text: '#F8FAFC',
          surface: '#1E293B',
        },
      },
    })
    .returning({ id: brandKits.id });
  kit = createdKit;
}

// 5. Construct Campaign Canvas Screens & Config
const brand = {
  primary: '#F59E0B',
  accent: '#10B981',
  background: '#0F172A',
  text: '#F8FAFC',
  surface: '#1E293B',
};

const stageElement = {
  id: 'game-stage-1',
  type: 'gameStage',
  name: 'Khu vực chơi game 2D',
  x: 20,
  y: 60,
  w: 335,
  h: 580,
  rotation: 0,
  opacity: 1,
  locked: true,
  hidden: false,
  animation: { enter: 'none', delayMs: 0 },
};

const titleElement = {
  id: 'title-text',
  type: 'text',
  name: 'Tiêu đề',
  x: 20,
  y: 200,
  w: 335,
  h: 80,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  content: 'HỨNG TRÀ SỮA\nNHẬN QUÀ 100%',
  font: 'display',
  size: 32,
  weight: 'bold',
  align: 'center',
  color: 'brand.primary',
  animation: { enter: 'fade', delayMs: 100 },
};

const ctaButton = {
  id: 'start-btn',
  type: 'button',
  name: 'Nút bắt đầu',
  x: 40,
  y: 450,
  w: 295,
  h: 54,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
  label: 'CHƠI NGAY MIỄN PHÍ',
  action: 'start',
  variant: 'primary',
  color: '#0F172A',
  background: 'brand.primary',
  radius: 27,
  animation: { enter: 'zoom', delayMs: 200 },
};

const screens = {
  cover: {
    height: 750,
    background: { color: 'brand.background' },
    elements: [titleElement, ctaButton],
  },
  form: {
    height: 750,
    background: { color: 'brand.background' },
    elements: [],
  },
  game: {
    height: 750,
    background: { color: 'brand.background' },
    elements: [stageElement],
  },
  resultWin: {
    height: 750,
    background: { color: 'brand.background' },
    elements: [],
  },
  resultLose: {
    height: 750,
    background: { color: 'brand.background' },
    elements: [],
  },
};

const now = Date.now();
const DAY_MS = 86_400_000;

const campaignDocument = {
  playbook: 'tet_traffic',
  compliance: {
    promotionType: 'not_linked',
    termsText: null,
    checklistAcknowledgedAt: new Date(now).toISOString(),
  },
  brand,
  screens,
  prizes: [
    {
      id: 'prize-milk-tea',
      name: 'Voucher Trà Sữa Miễn Phí 100%',
      quantity: 1000,
      valueVnd: 55000,
    },
    {
      id: 'prize-discount-50',
      name: 'Voucher Giảm 50% Toàn Menu',
      quantity: 2000,
      valueVnd: 25000,
    },
  ],
  rules: {
    mode: 'overall_win_rate',
    overallWinRate: 0.8, // 80% tỷ lệ trúng để test dễ dàng
    playsPerDay: 10,
    maxWinsPerPlayer: 10,
    startsAt: new Date(now - DAY_MS).toISOString(),
    endsAt: new Date(now + 30 * DAY_MS).toISOString(),
    openingHours: null,
    pacing: false,
    budgetVnd: null,
    collectForm: false,
    antiFraud: 'low',
    openDays: null,
    requireRedeemBeforeReplay: false,
  },
};

// 6. Check or Insert Event
const [existingEvent] = await db
  .select({ id: events.id })
  .from(events)
  .where(eq(events.slug, eventSlug));

let eventId = existingEvent?.id;

if (!eventId) {
  eventId = uuidv7();
  await db.insert(events).values({
    id: eventId,
    organizationId: orgId,
    brandKitId: kit?.id,
    slug: eventSlug,
    name: 'Hứng Trà Sữa May Mắn 2D',
    status: 'live',
    timezone: 'Asia/Ho_Chi_Minh',
    startsAt: new Date(now - DAY_MS),
    endsAt: new Date(now + 30 * DAY_MS),
    identity: 'anonymous',
    playerLimit: 10000,
    paused: false,
    participation: { playsPerDay: 10, totalPlays: 50 },
    antiFraud: { level: 'low' },
  });
  console.log(`✅ Đã tạo Sự kiện / Chiến dịch: "${eventSlug}"`);
} else {
  await db
    .update(events)
    .set({
      name: 'Hứng Trà Sữa May Mắn 2D',
      status: 'live',
      startsAt: new Date(now - DAY_MS),
      endsAt: new Date(now + 30 * DAY_MS),
      paused: false,
      participation: { playsPerDay: 10, totalPlays: 50 },
      antiFraud: { level: 'low' },
    })
    .where(eq(events.id, eventId));
  console.log(`✅ Đã cập nhật Sự kiện / Chiến dịch: "${eventSlug}"`);
}

// 7. Check or Insert Game
const [existingGame] = await db
  .select({ id: games.id })
  .from(games)
  .where(and(eq(games.organizationId, orgId), eq(games.eventId, eventId)));

let gameId = existingGame?.id;

if (!gameId) {
  gameId = uuidv7();
  await db.insert(games).values({
    id: gameId,
    organizationId: orgId,
    eventId: eventId,
    templateKey: 'catch-items',
    templateVersion: '1.0.0',
    skinKey: 'everyday',
    name: 'Hứng Trà Sữa',
    status: 'published',
    draftConfig: campaignDocument,
    hotConfig: {},
    sortOrder: 0,
  });
  console.log(`✅ Đã tạo Game record template "catch-items" (id: ${gameId})`);
} else {
  await db
    .update(games)
    .set({
      templateKey: 'catch-items',
      templateVersion: '1.0.0',
      skinKey: 'everyday',
      status: 'published',
      draftConfig: campaignDocument,
    })
    .where(eq(games.id, gameId));
}

// 8. Create Game Version 1
const [existingVersion] = await db
  .select({ id: gameVersions.id })
  .from(gameVersions)
  .where(and(eq(gameVersions.gameId, gameId), eq(gameVersions.version, 1)));

let versionId = existingVersion?.id;

if (!versionId) {
  versionId = uuidv7();
  await db.insert(gameVersions).values({
    id: versionId,
    organizationId: orgId,
    gameId: gameId,
    version: 1,
    templateKey: 'catch-items',
    templateVersion: '1.0.0',
    skinKey: 'everyday',
    config: campaignDocument,
    configHash: 'hash_catch_items_demo',
    publishedBy: targetUserId,
  });
  console.log(`✅ Đã tạo GameVersion v1 (id: ${versionId})`);
} else {
  await db
    .update(gameVersions)
    .set({
      templateKey: 'catch-items',
      skinKey: 'everyday',
      config: campaignDocument,
    })
    .where(eq(gameVersions.id, versionId));
}

// Update currentVersionId on game
await db.update(games).set({ currentVersionId: versionId }).where(eq(games.id, gameId));

// 9. Seed Prizes
const existingPrizes = await db
  .select({ id: prizes.id })
  .from(prizes)
  .where(eq(prizes.eventId, eventId));

if (existingPrizes.length === 0) {
  await db.insert(prizes).values([
    {
      id: uuidv7(),
      organizationId: orgId,
      eventId: eventId,
      gameId: gameId,
      key: 'prize-milk-tea',
      name: 'Voucher Trà Sữa Miễn Phí 100%',
      type: 'voucher_code',
      quantity: 1000,
      remaining: 1000,
      issued: 0,
      valueVnd: 55000,
      sortOrder: 1,
    },
    {
      id: uuidv7(),
      organizationId: orgId,
      eventId: eventId,
      gameId: gameId,
      key: 'prize-discount-50',
      name: 'Voucher Giảm 50% Toàn Menu',
      type: 'voucher_code',
      quantity: 2000,
      remaining: 2000,
      issued: 0,
      valueVnd: 25000,
      sortOrder: 2,
    },
  ]);
  console.log('✅ Đã tạo 2 giải thưởng trong bảng prizes (kho 3000 quà)');
} else {
  console.log(`ℹ️ Đã có ${existingPrizes.length} giải thưởng, giữ nguyên dữ liệu giải.`);
}

await sql.end();

console.log('\n======================================================');
console.log('🎉 SEED THÀNH CÔNG GAME 2D! BẠN CÓ THỂ TEST NGAY:');
console.log('======================================================');
console.log(`📱 1. Chơi trực tiếp trên app Play (chiến dịch thật):`);
console.log(`   👉 http://localhost:3002/${eventSlug}`);
console.log(`\n🎮 2. Xem trước & Rehearsal Test trong Game SDK:`);
console.log(`   👉 http://localhost:3002/preview?template=catch-items`);
console.log(`\n🏢 3. Quản lý chiến dịch trong Studio:`);
console.log(`   👉 http://localhost:3001/orgs/${orgSlug}/campaigns`);
console.log('======================================================\n');
