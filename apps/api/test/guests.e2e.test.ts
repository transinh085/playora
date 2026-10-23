import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import {
  buildEventJoinUrl,
  ErrorCode,
  eventsApi,
  guestsApi,
  UNASSIGNED_TEAM_FILTER,
} from '@playora/contracts';
import ExcelJS from 'exceljs';
import { createOrg, createTestApp, signUp, type TestApp, uniqueSlug } from './create-test-app';

let t: TestApp;
let alice: string;
let bob: string;
let aliceOrg: string;
let bobOrg: string;

beforeAll(async () => {
  t = await createTestApp();
  alice = await signUp(t.baseUrl, 'Alice');
  bob = await signUp(t.baseUrl, 'Bob');
  aliceOrg = await createOrg(t.baseUrl, alice);
  bobOrg = await createOrg(t.baseUrl, bob);
});

afterAll(() => t?.close());

async function expectApiError(promise: Promise<unknown>, status: number, code: ErrorCode) {
  const err = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status, code });
}

async function createEvent(cookie: string, orgId: string) {
  return t.client(cookie).call(eventsApi.create, {
    params: { orgId },
    body: { name: 'Guest Test Event', slug: uniqueSlug('guests'), identity: 'guest_list' },
  });
}

async function buildXlsxBase64(rows: string[][]): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Guests');
  for (const row of rows) {
    ws.addRow(row);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer).toString('base64');
}

describe('guests API', () => {
  test('previews and imports CSV with column mapping, extra attributes, and upserts on (eventId, externalCode)', async () => {
    const api = t.client(alice);
    const event = await createEvent(alice, aliceOrg);
    const params = { orgId: aliceOrg, eventId: event.id };

    const csv = [
      'ma_nv,ho_ten,phong_ban,ban,khu_vuc',
      'NV001,Nguyễn Văn A,Kinh doanh,B01,VIP',
      'NV002,Trần Thị B,Kỹ thuật,B02,Sảnh A',
      'NV003,Lê Văn C,,B03,Sảnh B',
    ].join('\n');

    const preview = await api.call(guestsApi.preview, {
      params,
      body: { fileName: 'guests.csv', content: csv },
    });
    expect(preview.headers).toEqual(['ma_nv', 'ho_ten', 'phong_ban', 'ban', 'khu_vuc']);
    expect(preview.totalRows).toBe(3);
    expect(preview.suggestedMapping).toEqual({
      externalCode: 'ma_nv',
      displayName: 'ho_ten',
      team: 'phong_ban',
    });
    expect(preview.sampleRows[0]).toMatchObject({
      ma_nv: 'NV001',
      ho_ten: 'Nguyễn Văn A',
      phong_ban: 'Kinh doanh',
      ban: 'B01',
    });

    const firstImport = await api.call(guestsApi.import, {
      params,
      body: {
        fileName: 'guests.csv',
        content: csv,
        mapping: { externalCode: 'ma_nv', displayName: 'ho_ten', team: 'phong_ban' },
      },
    });
    expect(firstImport).toEqual({
      inserted: 3,
      updated: 0,
      skipped: 0,
      errors: [],
    });

    // Upsert: update NV001 and NV002, insert NV004
    const secondCsv = [
      'ma_nv,ho_ten,phong_ban,ban,khu_vuc',
      'NV001,Nguyễn Văn A (Updated),Marketing,B10,VIP-2',
      'NV002,Trần Thị B,Kỹ thuật,B02,Sảnh A',
      'NV004,Phạm Thị D,Marketing,B04,Sảnh C',
    ].join('\n');

    const secondImport = await api.call(guestsApi.import, {
      params,
      body: {
        fileName: 'guests-update.csv',
        content: secondCsv,
        mapping: { externalCode: 'ma_nv', displayName: 'ho_ten', team: 'phong_ban' },
      },
    });
    expect(secondImport).toEqual({
      inserted: 1,
      updated: 2,
      skipped: 0,
      errors: [],
    });

    const page = await api.call(guestsApi.list, { params, query: { search: 'NV001' } });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      externalCode: 'NV001',
      displayName: 'Nguyễn Văn A (Updated)',
      team: 'Marketing',
      attributes: { ban: 'B10', khu_vuc: 'VIP-2' },
    });
  });

  test('imports XLSX files and captures row-level errors with row numbers', async () => {
    const api = t.client(alice);
    const event = await createEvent(alice, aliceOrg);
    const params = { orgId: aliceOrg, eventId: event.id };

    const xlsxBase64 = await buildXlsxBase64([
      ['externalCode', 'displayName', 'team', 'seat'],
      ['EMP-01', 'Hoàng Minh', 'Product', 'A1'], // row 2: valid
      ['', 'Missing Code Guest', 'Product', 'A2'], // row 3: missing externalCode
      ['EMP-02', 'Đặng Thu Thảo', 'Design', 'A3'], // row 4: valid
      ['EMP-03', '', 'Design', 'A4'], // row 5: missing displayName
    ]);

    const result = await api.call(guestsApi.import, {
      params,
      body: {
        fileName: 'guests.xlsx',
        content: xlsxBase64,
        mapping: { externalCode: 'externalCode', displayName: 'displayName', team: 'team' },
      },
    });

    expect(result.inserted).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(2);
    expect(result.errors).toEqual([
      { row: 3, message: 'Missing externalCode' },
      { row: 5, message: 'Missing displayName' },
    ]);

    const list = await api.call(guestsApi.list, { params });
    expect(list.items).toHaveLength(2);
    expect(list.items.map((g) => g.externalCode).sort()).toEqual(['EMP-01', 'EMP-02']);
  });

  test('lists guests with pagination, search, team filter, and deletes one or all', async () => {
    const api = t.client(alice);
    const event = await createEvent(alice, aliceOrg);
    const params = { orgId: aliceOrg, eventId: event.id };

    const csv = [
      'externalCode,displayName,team',
      'C01,Alpha One,Red',
      'C02,Beta Two,Blue',
      'C03,Gamma Three,Red',
      'C04,Delta Four,',
      'C05,Epsilon Five,Blue',
    ].join('\n');

    await api.call(guestsApi.import, {
      params,
      body: { fileName: 'list.csv', content: csv },
    });

    // Cursor pagination
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await api.call(guestsApi.list, { params, query: { limit: 2, cursor } });
      seen.push(...page.items.map((g) => g.externalCode));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen.sort()).toEqual(['C01', 'C02', 'C03', 'C04', 'C05']);

    // Search by name or code
    const byName = await api.call(guestsApi.list, { params, query: { search: 'gamma' } });
    expect(byName.items.map((g) => g.externalCode)).toEqual(['C03']);

    const byCode = await api.call(guestsApi.list, { params, query: { search: 'C05' } });
    expect(byCode.items.map((g) => g.displayName)).toEqual(['Epsilon Five']);

    // Filter by team and unassigned
    const redTeam = await api.call(guestsApi.list, { params, query: { team: 'Red' } });
    expect(redTeam.items.map((g) => g.externalCode).sort()).toEqual(['C01', 'C03']);

    const unassigned = await api.call(guestsApi.list, {
      params,
      query: { team: UNASSIGNED_TEAM_FILTER },
    });
    expect(unassigned.items.map((g) => g.externalCode)).toEqual(['C04']);

    // Team counts
    const teams = await api.call(guestsApi.listTeams, { params });
    expect(teams).toEqual({
      items: [
        { team: 'Blue', count: 2 },
        { team: 'Red', count: 2 },
      ],
      unassignedCount: 1,
      totalCount: 5,
    });

    // Delete one
    const targetId = redTeam.items[0]?.id ?? '';
    expect(targetId).not.toBe('');
    await api.call(guestsApi.remove, { params: { ...params, guestId: targetId } });
    await expectApiError(
      api.call(guestsApi.remove, { params: { ...params, guestId: targetId } }),
      404,
      ErrorCode.NOT_FOUND,
    );

    // Delete all
    const cleared = await api.call(guestsApi.clear, { params });
    expect(cleared).toEqual({ ok: true, deleted: 4 });

    const afterClear = await api.call(guestsApi.list, { params });
    expect(afterClear.items).toHaveLength(0);
  });

  test('auto-assigns random balanced teams to guests without team', async () => {
    const api = t.client(alice);
    const event = await createEvent(alice, aliceOrg);
    const params = { orgId: aliceOrg, eventId: event.id };

    // 2 already on Team A, 8 unassigned -> 10 total across 3 teams ('Team A', 'Team B', 'Team C')
    // Balanced result should be counts [4, 3, 3]
    const rows = [
      'externalCode,displayName,team',
      'G01,Guest 1,Team A',
      'G02,Guest 2,Team A',
      ...Array.from({ length: 8 }, (_, i) => `U0${i + 1},Unassigned ${i + 1},`),
    ].join('\n');

    await api.call(guestsApi.import, {
      params,
      body: { fileName: 'teams.csv', content: rows },
    });

    const assigned = await api.call(guestsApi.assignTeams, {
      params,
      body: { teams: ['Team A', 'Team B', 'Team C'] },
    });

    expect(assigned.assigned).toBe(8);
    const counts = assigned.teams.map((item) => item.count).sort((a, b) => a - b);
    expect(counts).toEqual([3, 3, 4]);

    const afterSummary = await api.call(guestsApi.listTeams, { params });
    expect(afterSummary.unassignedCount).toBe(0);
    expect(afterSummary.totalCount).toBe(10);
  });

  test('validates 400 on bad format, missing headers, duplicate teams, and > 50,000 rows', async () => {
    const api = t.client(alice);
    const event = await createEvent(alice, aliceOrg);
    const params = { orgId: aliceOrg, eventId: event.id };

    // Unsupported extension
    await expectApiError(
      api.call(guestsApi.import, {
        params,
        body: { fileName: 'guests.txt', content: 'externalCode,displayName\nA,B' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Invalid XLSX content
    await expectApiError(
      api.call(guestsApi.import, {
        params,
        body: { fileName: 'guests.xlsx', content: 'not-a-zip-file' },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Mapped column not found
    await expectApiError(
      api.call(guestsApi.import, {
        params,
        body: {
          fileName: 'guests.csv',
          content: 'colA,colB\n1,2',
          mapping: { externalCode: 'missing_col', displayName: 'colB' },
        },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Duplicate team names in assignTeams
    await expectApiError(
      api.call(guestsApi.assignTeams, {
        params,
        body: { teams: ['Alpha', 'alpha'] },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );

    // Exceeding 50,000 rows limit
    const header = 'externalCode,displayName\n';
    const tooManyRows = header + Array.from({ length: 50_001 }, (_, i) => `${i},N`).join('\n');
    await expectApiError(
      api.call(guestsApi.import, {
        params,
        body: { fileName: 'huge.csv', content: tooManyRows },
      }),
      400,
      ErrorCode.VALIDATION_FAILED,
    );
  });

  test('anonymous requests are rejected with 401', async () => {
    const event = await createEvent(alice, aliceOrg);
    const params = { orgId: aliceOrg, eventId: event.id };

    await expectApiError(t.client().call(guestsApi.list, { params }), 401, ErrorCode.UNAUTHORIZED);
    await expectApiError(
      t.client().call(guestsApi.import, {
        params,
        body: { fileName: 'a.csv', content: 'externalCode,displayName\n1,A' },
      }),
      401,
      ErrorCode.UNAUTHORIZED,
    );
  });

  test('tenant isolation: another org gets 403 on org routes and 404 on cross-tenant eventId', async () => {
    const aliceEvent = await createEvent(alice, aliceOrg);
    const asBob = t.client(bob);
    const aliceParams = { orgId: aliceOrg, eventId: aliceEvent.id };
    const crossTenantParams = { orgId: bobOrg, eventId: aliceEvent.id };

    // Bob targeting Alice's orgId -> 403 FORBIDDEN
    await expectApiError(
      asBob.call(guestsApi.list, { params: aliceParams }),
      403,
      ErrorCode.FORBIDDEN,
    );
    await expectApiError(
      asBob.call(guestsApi.import, {
        params: aliceParams,
        body: { fileName: 'a.csv', content: 'externalCode,displayName\n1,A' },
      }),
      403,
      ErrorCode.FORBIDDEN,
    );

    // Bob using his own orgId but targeting Alice's eventId -> 404 NOT_FOUND on every endpoint
    await expectApiError(
      asBob.call(guestsApi.list, { params: crossTenantParams }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(guestsApi.preview, {
        params: crossTenantParams,
        body: { fileName: 'a.csv', content: 'externalCode,displayName\n1,A' },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(guestsApi.import, {
        params: crossTenantParams,
        body: { fileName: 'a.csv', content: 'externalCode,displayName\n1,A' },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(guestsApi.listTeams, { params: crossTenantParams }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(guestsApi.assignTeams, {
        params: crossTenantParams,
        body: { teams: ['A', 'B'] },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(guestsApi.remove, {
        params: { ...crossTenantParams, guestId: aliceEvent.id },
      }),
      404,
      ErrorCode.NOT_FOUND,
    );
    await expectApiError(
      asBob.call(guestsApi.clear, { params: crossTenantParams }),
      404,
      ErrorCode.NOT_FOUND,
    );
  });

  test('buildEventJoinUrl constructs player URL with optional table/zone query', () => {
    expect(buildEventJoinUrl('http://localhost:3002/', 'yep-2026')).toBe(
      'http://localhost:3002/yep-2026',
    );
    expect(buildEventJoinUrl('http://localhost:3002', 'yep-2026', 'Bàn VIP 1')).toBe(
      'http://localhost:3002/yep-2026?t=B%C3%A0n+VIP+1',
    );
  });
});
