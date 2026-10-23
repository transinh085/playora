import type { INestApplication } from '@nestjs/common';
import type { Auth } from '@playora/auth';
import { toNodeHandler } from 'better-auth/node';
import express from 'express';
import { AUTH } from '../infra/tokens';

/**
 * Better Auth must see the raw request body, so it is mounted before the JSON parser
 * (the app is created with `bodyParser: false`).
 */
export function mountAuth(app: INestApplication) {
  const auth = app.get<Auth>(AUTH);
  const server = app.getHttpAdapter().getInstance() as express.Express;
  server.all('/auth/{*path}', toNodeHandler(auth));
  server.use(express.json({ limit: '1mb' }));
}
