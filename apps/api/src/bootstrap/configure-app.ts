import type { INestApplication } from '@nestjs/common';
import type { Auth } from '@playora/auth';
import type { ApiEnv } from '@playora/env';
import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ApiExceptionFilter } from '../common/http/api-exception.filter';
import { AUTH } from '../infra/tokens';

/**
 * Everything that must be identical in production and in integration tests.
 * The app must be created with `{ bodyParser: false, bufferLogs: true }`.
 */
export function configureApp(app: INestApplication, env: ApiEnv) {
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({ origin: env.STUDIO_ORIGINS.split(','), credentials: true });

  // Better Auth reads the raw body, so it is mounted before the JSON parser.
  const server = app.getHttpAdapter().getInstance() as express.Express;
  server.set('trust proxy', env.TRUST_PROXY);
  server.all('/auth/{*path}', toNodeHandler(app.get<Auth>(AUTH)));
  server.post(
    [
      '/v1/orgs/:orgId/events/:eventId/guests/preview',
      '/v1/orgs/:orgId/events/:eventId/guests/import',
    ],
    express.json({ limit: '15mb' }),
  );
  server.use(express.json({ limit: '1mb' }));

  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
