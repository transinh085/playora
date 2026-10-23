import { z } from 'zod';

const nodeEnv = z.enum(['development', 'test', 'production']).default('development');
const logLevel = z
  .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  .default('info');

const s3Env = {
  S3_ENDPOINT: z.url().default('http://localhost:9000'),
  S3_BUCKET: z.string().min(1).default('playora-dev'),
  S3_ACCESS_KEY: z.string().min(1).default('playora'),
  S3_SECRET_KEY: z.string().min(1).default('playora123'),
};

export const apiEnvSchema = z.object({
  NODE_ENV: nodeEnv,
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_PUBLIC_URL: z.url().default('http://localhost:4000'),
  DATABASE_URL: z.url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  REDIS_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  LOG_LEVEL: logLevel,
  /** Requests per minute per client (IP) across all API instances. */
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(300),
  /** Express `trust proxy` — number of proxy hops in front of the API (Cloudflare + LB = 2). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Comma-separated origins allowed to call the API with cookies (Studio, Play). */
  STUDIO_ORIGINS: z.string().default('http://localhost:3001,http://localhost:3002'),
  ...s3Env,
});

export const realtimeEnvSchema = z.object({
  NODE_ENV: nodeEnv,
  REALTIME_PORT: z.coerce.number().int().positive().default(4001),
  REDIS_URL: z.url(),
  /** Comma-separated list of origins allowed to open a socket. */
  REALTIME_CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:3002'),
  /** M0 spike only: shared key for host sockets. Replaced by organizer session tickets in M1. */
  REALTIME_HOST_KEY: z.string().min(8).default('dev-host-key'),
});

export const workerEnvSchema = z.object({
  NODE_ENV: nodeEnv,
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(4002),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  ...s3Env,
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type RealtimeEnv = z.infer<typeof realtimeEnvSchema>;
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
