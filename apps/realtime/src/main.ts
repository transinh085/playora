import 'reflect-metadata';
import { type INestApplicationContext, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { parseEnv, realtimeEnvSchema } from '@playora/env';
import type { ServerOptions } from 'socket.io';
import { AppModule } from './app.module';

const env = parseEnv(realtimeEnvSchema);

class ConfiguredIoAdapter extends IoAdapter {
  constructor(app: INestApplicationContext) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: env.REALTIME_CORS_ORIGINS.split(','), credentials: true },
      // Small payloads, many clients: skip per-message compression and keep pings cheap.
      perMessageDeflate: false,
      pingInterval: 20_000,
      pingTimeout: 20_000,
      maxHttpBufferSize: 4 * 1024,
    } as ServerOptions);
  }
}

const app = await NestFactory.create(AppModule.forRoot(env));
app.useWebSocketAdapter(new ConfiguredIoAdapter(app));
app.enableCors({ origin: env.REALTIME_CORS_ORIGINS.split(',') });
app.enableShutdownHooks();

await app.listen(env.REALTIME_PORT);
Logger.log(`Realtime listening on ws://localhost:${env.REALTIME_PORT}/live`, 'Bootstrap');
