import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { parseEnv, realtimeEnvSchema } from '@playora/env';
import { ConfiguredIoAdapter } from './adapter';
import { AppModule } from './app.module';

const env = parseEnv(realtimeEnvSchema);
const origins = env.REALTIME_CORS_ORIGINS.split(',');

const app = await NestFactory.create(AppModule.forRoot(env));
app.useWebSocketAdapter(new ConfiguredIoAdapter(app, origins));
app.enableCors({ origin: origins });
app.enableShutdownHooks();

await app.listen(env.REALTIME_PORT);
Logger.log(`Realtime listening on ws://localhost:${env.REALTIME_PORT}/live`, 'Bootstrap');
