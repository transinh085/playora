import { check } from 'k6';
import http from 'k6/http';

/**
 * k6 load test for the Playora Campaign Play API (docs/engineering/architecture.md §6.2).
 *
 * Contracts:
 * - Join: `POST /v1/p/:slug/join` (`packages/contracts/src/api/public.ts` -> `publicApi.join`)
 * - Play: `POST /v1/p/:slug/plays` (`packages/contracts/src/api/plays.ts` -> `playsApi.play`)
 *
 * Target: 500 plays/s for 60 s with p95 < 200 ms and http_req_failed < 0.1%.
 *
 * Usage:
 *   BASE_URL=http://localhost:4000 SLUG=tet-2027 k6 run tooling/loadtest/play.js
 */

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const SLUG = __ENV.SLUG || 'tet-2027';

export const options = {
  scenarios: {
    plays: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],
    'http_req_duration{endpoint:play}': ['p(95)<200'],
    http_req_failed: ['rate<0.001'],
  },
};

const HEX = '0123456789abcdef';

/** Generates an RFC 4122 v4 UUID matching `z.uuid()` in `@playora/contracts`. */
function uuidv4() {
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4';
    } else if (i === 19) {
      out += HEX[(Math.floor(Math.random() * 4) + 8) & 0xf];
    } else {
      out += HEX[Math.floor(Math.random() * 16)];
    }
  }
  return out;
}

// Per-VU session token cache; cleared when a player exhausts daily turns.
let playerToken = null;

/**
 * Each VU poses as its own client IP. Start the API with TRUST_PROXY=1 so per-IP limits apply
 * per VU, as they would behind Cloudflare with real guests.
 */
const clientIp = () => `10.${(__VU >> 16) & 255}.${(__VU >> 8) & 255}.${__VU & 255}`;

function joinCampaign() {
  const deviceId = `k6-vu-${__VU}-${uuidv4()}`;
  const phoneSuffix = String(10000000 + ((__VU * 9973 + __ITER) % 90000000)).slice(0, 8);
  const displayName = `Khách k6 #${__VU}-${__ITER}`;

  const payload = JSON.stringify({
    deviceId,
    displayName,
    fields: {
      name: displayName,
      full_name: displayName,
      phone: `09${phoneSuffix}`,
    },
    consents: {
      participation: true,
      marketing: true,
    },
  });

  const res = http.post(`${BASE_URL}/v1/p/${encodeURIComponent(SLUG)}/join`, payload, {
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': clientIp() },
    tags: { endpoint: 'join' },
  });

  const ok = check(res, {
    'join status is 200': (r) => r.status === 200,
    'join returns playerToken': (r) => {
      if (r.status !== 200) return false;
      const body = r.json();
      return Boolean(body && typeof body.playerToken === 'string' && body.playerToken.length > 0);
    },
  });

  if (!ok) {
    return null;
  }

  const body = res.json();
  return body ? body.playerToken : null;
}

export default function () {
  if (!playerToken) {
    playerToken = joinCampaign();
    if (!playerToken) {
      return;
    }
  }

  const playPayload = JSON.stringify({
    requestId: uuidv4(),
  });

  const playRes = http.post(`${BASE_URL}/v1/p/${encodeURIComponent(SLUG)}/plays`, playPayload, {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': clientIp(),
      Authorization: `Bearer ${playerToken}`,
    },
    tags: { endpoint: 'play' },
  });

  check(playRes, {
    'play status is 200': (r) => r.status === 200,
    'play returns valid PlayResult': (r) => {
      if (r.status !== 200) return false;
      const body = r.json();
      return Boolean(
        body &&
          typeof body.outcome === 'string' &&
          typeof body.reason === 'string' &&
          typeof body.turnsLeftToday === 'number',
      );
    },
  });

  if (playRes.status === 200) {
    const body = playRes.json();
    if (body && (body.turnsLeftToday <= 0 || body.outcome === 'no_turns')) {
      // Rotate to a new player device on next iteration once daily turns are used up.
      playerToken = null;
    }
  } else if (playRes.status === 401 || playRes.status === 403) {
    playerToken = null;
  }
}
