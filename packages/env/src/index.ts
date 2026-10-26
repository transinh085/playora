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

const s3Env = {
  S3_ENDPOINT: z.url().default('http://localhost:9000'),
  S3_BUCKET: z.string().min(1).default('playora-dev'),
  S3_ACCESS_KEY: z.string().min(1).default(DEV_DEFAULT_S3_ACCESS_KEY),
  S3_SECRET_KEY: z.string().min(1).default(DEV_DEFAULT_S3_SECRET_KEY),
};

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
  })
  .superRefine(refineProductionS3);

export const workerEnvSchema = z
  .object({
    NODE_ENV: nodeEnv,
    WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(4002),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    ...s3Env,
  })
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
