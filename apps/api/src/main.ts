import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { apiEnvSchema, parseEnv } from '@playora/env';
import { AppModule } from './app.module';
import { mountAuth } from './auth/mount-auth';
import { ApiExceptionFilter } from './common/api-exception.filter';

const env = parseEnv(apiEnvSchema);

const app = await NestFactory.create(AppModule.forRoot(env), { bodyParser: false });
app.enableCors({ origin: env.STUDIO_ORIGINS.split(','), credentials: true });
mountAuth(app);
app.setGlobalPrefix('v1');
app.useGlobalFilters(new ApiExceptionFilter());
app.enableShutdownHooks();

await app.listen(env.API_PORT);
Logger.log(`API listening on http://localhost:${env.API_PORT}/v1`, 'Bootstrap');
