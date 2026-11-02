import { z } from 'zod';

const nodeEnv = z.enum(['development', 'test', 'production']).default('development');
const logLevel = z
  .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  .default('info');
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

export const DEV_DEFAULT_S3_ACCESS_KEY = 'playora';
export const DEV_DEFAULT_S3_SECRET_KEY = 'playora123';
export const DEV_DEFAULT_S3_BUCKET = 'playora-dev';
export const DEV_DEFAULT_S3_ENDPOINT = 'http://localhost:9000';

const s3Env = {
  /** Storage driver: 's3' or 'local'. Defaults to 's3'. */
  FILESYSTEM_DISK: z.enum(['local', 's3']).default('s3'),

  /** S3 / MinIO bucket name. Accepts AWS_BUCKET or S3_BUCKET. */
  S3_BUCKET: optionalString,
  AWS_BUCKET: optionalString,

  /** S3 region. Accepts AWS_DEFAULT_REGION, AWS_REGION, or S3_REGION. */
  S3_REGION: optionalString,
  AWS_DEFAULT_REGION: optionalString,
  AWS_REGION: optionalString,

  /** S3 / MinIO access key ID. Accepts AWS_ACCESS_KEY_ID or S3_ACCESS_KEY. */
  S3_ACCESS_KEY: optionalString,
  AWS_ACCESS_KEY_ID: optionalString,

  /** S3 / MinIO secret access key. Accepts AWS_SECRET_ACCESS_KEY or S3_SECRET_KEY. */
  S3_SECRET_KEY: optionalString,
  AWS_SECRET_ACCESS_KEY: optionalString,

  /** S3 endpoint URL (MinIO, R2, CDN). Accepts AWS_URL, AWS_ENDPOINT, or S3_ENDPOINT. */
  S3_ENDPOINT: optionalString,
  AWS_URL: optionalString,
  AWS_ENDPOINT: optionalString,

  /** Path-style endpoint vs virtual-hosted-style (false = virtual-hosted style). */
  S3_USE_PATH_STYLE_ENDPOINT: z.stringbool().optional(),
  AWS_USE_PATH_STYLE_ENDPOINT: z.stringbool().optional(),
};

function resolveS3Config<
  T extends {
    FILESYSTEM_DISK?: 'local' | 's3';
    S3_BUCKET?: string;
    AWS_BUCKET?: string;
    S3_REGION?: string;
    AWS_DEFAULT_REGION?: string;
    AWS_REGION?: string;
    S3_ACCESS_KEY?: string;
    AWS_ACCESS_KEY_ID?: string;
    S3_SECRET_KEY?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    S3_ENDPOINT?: string;
    AWS_URL?: string;
    AWS_ENDPOINT?: string;
    S3_USE_PATH_STYLE_ENDPOINT?: boolean;
    AWS_USE_PATH_STYLE_ENDPOINT?: boolean;
  },
>(data: T) {
  const accessKey = data.S3_ACCESS_KEY || data.AWS_ACCESS_KEY_ID || DEV_DEFAULT_S3_ACCESS_KEY;
  const secretKey = data.S3_SECRET_KEY || data.AWS_SECRET_ACCESS_KEY || DEV_DEFAULT_S3_SECRET_KEY;
  const bucket = data.S3_BUCKET || data.AWS_BUCKET || DEV_DEFAULT_S3_BUCKET;
  const region = data.S3_REGION || data.AWS_DEFAULT_REGION || data.AWS_REGION || 'ap-southeast-1';
  const customEndpoint = data.S3_ENDPOINT || data.AWS_URL || data.AWS_ENDPOINT;
  const hasAwsExplicit = Boolean(
    data.AWS_ACCESS_KEY_ID ||
      data.AWS_SECRET_ACCESS_KEY ||
      data.AWS_DEFAULT_REGION ||
      data.AWS_REGION ||
      data.AWS_BUCKET,
  );
  const endpoint = customEndpoint || (hasAwsExplicit ? undefined : DEV_DEFAULT_S3_ENDPOINT);
  const usePathStyle =
    data.AWS_USE_PATH_STYLE_ENDPOINT ??
    data.S3_USE_PATH_STYLE_ENDPOINT ??
    Boolean(endpoint?.includes('localhost:9000') || endpoint?.includes('127.0.0.1:9000'));

  return {
    ...data,
    FILESYSTEM_DISK: data.FILESYSTEM_DISK ?? 's3',
    S3_ACCESS_KEY: accessKey,
    S3_SECRET_KEY: secretKey,
    S3_BUCKET: bucket,
    S3_REGION: region,
    S3_ENDPOINT: endpoint,
    S3_USE_PATH_STYLE_ENDPOINT: usePathStyle,
  };
}

function refineProductionS3<
  T extends {
    NODE_ENV: 'development' | 'test' | 'production';
    S3_ACCESS_KEY: string;
    S3_SECRET_KEY: string;
  },
>(data: T, ctx: z.RefinementCtx) {
  if (data.NODE_ENV === 'production') {
    if (data.S3_ACCESS_KEY === DEV_DEFAULT_S3_ACCESS_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_ACCESS_KEY'],
        message: `S3_ACCESS_KEY must not use the dev default ("${DEV_DEFAULT_S3_ACCESS_KEY}") in production`,
      });
    }
    if (data.S3_SECRET_KEY === DEV_DEFAULT_S3_SECRET_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_SECRET_KEY'],
        message: `S3_SECRET_KEY must not use the dev default ("${DEV_DEFAULT_S3_SECRET_KEY}") in production`,
      });
    }
  }
}

export const DEV_DEFAULT_PII_ENCRYPTION_KEY = 'cGxheW9yYS1kZXYtcGlpLWVuY3J5cHRpb24ta2V5ISE=';
export const DEV_DEFAULT_PII_HMAC_KEY = 'cGxheW9yYS1kZXYtcGlpLWhtYWMta2V5LTAwMDAwMDA=';

const BASE64_REGEX = /^[A-Za-z0-9+/_-]+={0,2}$/;
const base64Bytes = (v: string) => (BASE64_REGEX.test(v) ? Buffer.from(v, 'base64').length : 0);

/**
 * Application-level PII encryption (`@playora/core/pii`, docs/engineering/security.md §3).
 * Generate each key with `openssl rand -base64 32`. Production rejects the dev defaults.
 */
const piiEnv = {
  /** AES-256-GCM key for players.phone_enc: base64 of exactly 32 bytes. */
  PII_ENCRYPTION_KEY: z
    .string()
    .trim()
    .default(DEV_DEFAULT_PII_ENCRYPTION_KEY)
    .refine((v) => base64Bytes(v) === 32, 'PII_ENCRYPTION_KEY must be base64 of 32 bytes'),
  /** Id written in front of new ciphertexts (`v1:…`); change it together with the key. */
  PII_ENCRYPTION_KEY_ID: z
    .string()
    .regex(/^[a-z0-9]{1,16}$/)
    .default('v1'),
  /** Older keys still needed to decrypt existing rows after a rotation: `v1:base64,v2:base64`. */
  PII_ENCRYPTION_PREVIOUS_KEYS: optionalString,
  /** HMAC-SHA256 key for lookup hashes (players.phone_hash): base64, at least 32 bytes. */
  PII_HMAC_KEY: z
    .string()
    .trim()
    .default(DEV_DEFAULT_PII_HMAC_KEY)
    .refine((v) => base64Bytes(v) >= 32, 'PII_HMAC_KEY must be base64 of at least 32 bytes'),
};

function refineProductionPii<
  T extends {
    NODE_ENV: 'development' | 'test' | 'production';
    PII_ENCRYPTION_KEY: string;
    PII_HMAC_KEY: string;
  },
>(data: T, ctx: z.RefinementCtx) {
  if (data.NODE_ENV !== 'production') return;
  if (data.PII_ENCRYPTION_KEY === DEV_DEFAULT_PII_ENCRYPTION_KEY) {
    ctx.addIssue({
      code: 'custom',
      path: ['PII_ENCRYPTION_KEY'],
      message: 'PII_ENCRYPTION_KEY must not use the dev default in production',
    });
  }
  if (data.PII_HMAC_KEY === DEV_DEFAULT_PII_HMAC_KEY) {
    ctx.addIssue({
      code: 'custom',
      path: ['PII_HMAC_KEY'],
      message: 'PII_HMAC_KEY must not use the dev default in production',
    });
  }
}

/** Signs and verifies player session tokens — see @playora/core/session. */
const playerSessionEnv = {
  PLAYER_SESSION_SECRET: z.string().min(32),
};

export const apiEnvSchema = z
  .object({
    NODE_ENV: nodeEnv,
    API_PORT: z.coerce.number().int().positive().default(4000),
    API_PUBLIC_URL: z.url().default('http://localhost:4000'),
    PLAY_URL: z.url().default('http://localhost:3002'),
    DATABASE_URL: z.url(),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    REDIS_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    LOG_LEVEL: logLevel,
    /** Requests per minute per client (IP) across all API instances. */
    RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(300),
    /** High per-IP rate limit (per minute) for public player endpoints behind venue NAT. */
    PUBLIC_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(6000),
    /** Express `trust proxy` — number of proxy hops in front of the API (Cloudflare + LB = 2). */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    /** Comma-separated origins allowed to call the API with cookies (Studio, Play). */
    STUDIO_ORIGINS: z.string().default('http://localhost:3001,http://localhost:3002'),
    /** Parent cookie domain for cross-subdomain session cookies in production (e.g. .playora.vn; docs/engineering/architecture.md §8). */
    COOKIE_DOMAIN: optionalString,
    /** SMTP settings for transactional emails (Mailpit on 1025 in dev). */
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_FROM: z.string().default('Playora <noreply@playora.local>'),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    /** Optional Google OAuth credentials (ORG-01); enabled only when both are present. */
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    /**
     * Cloudflare Turnstile (EVT-13 "Chuẩn"): plays ask for a challenge only when the secret is set.
     * The site key is handed to the player shell; both empty = no challenge.
     */
    TURNSTILE_SITE_KEY: optionalString,
    TURNSTILE_SECRET_KEY: optionalString,
    /**
     * Comma-separated emails of Playora staff allowed on the back-office routes (`/admin/*`):
     * manual plan activation and invoices (BIL-01). Empty = nobody.
     */
    PLATFORM_ADMIN_EMAILS: z
      .string()
      .optional()
      .transform((v) =>
        (v ?? '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.length > 0),
      ),
    ...s3Env,
    ...playerSessionEnv,
    ...piiEnv,
  })
  .transform(resolveS3Config)
  .superRefine((data, ctx) => {
    refineProductionS3(data, ctx);
    refineProductionPii(data, ctx);
  });

export const workerEnvSchema = z
  .object({
    NODE_ENV: nodeEnv,
    WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(4002),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    ...s3Env,
  })
  .transform(resolveS3Config)
  .superRefine(refineProductionS3);

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

/** Parse env at boot and crash early with a readable message when something is missing. */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
