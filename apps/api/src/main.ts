import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { apiEnvSchema, parseEnv } from '@playora/env';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';

const env = parseEnv(apiEnvSchema);

const app = await NestFactory.create(AppModule.forRoot(env), {
  bodyParser: false,
  bufferLogs: true,
});
configureApp(app, env);
await app.listen(env.API_PORT);
app.get(Logger).log(`API listening on ${env.API_PUBLIC_URL}/v1`);
