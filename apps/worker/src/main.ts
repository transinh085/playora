import 'reflect-metadata';
import { createServer } from 'node:http';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { parseEnv, workerEnvSchema } from '@playora/env';
import { AppModule } from './app.module';
import { WorkersService } from './queues/workers.service';

const env = parseEnv(workerEnvSchema);

const app = await NestFactory.createApplicationContext(AppModule.forRoot(env));
app.enableShutdownHooks();
const workers = app.get(WorkersService);

// Liveness for the orchestrator; the worker has no other HTTP surface.
createServer((_req, res) => {
  const isHealthy = workers.isHealthy;
  res.writeHead(isHealthy ? 200 : 503, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ status: isHealthy ? 'ok' : 'down', workers: workers.running }));
}).listen(env.WORKER_HEALTH_PORT, () =>
  Logger.log(`Worker health on http://localhost:${env.WORKER_HEALTH_PORT}`, 'Bootstrap'),
);
