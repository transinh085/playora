import { Controller, Get, Inject } from '@nestjs/common';
import { allRoutes, buildOpenApiDocument } from '@playora/contracts';
import type { ApiEnv } from '@playora/env';
import { Public } from '../../common/auth/decorators';
import { ENV } from '../../infra/tokens';

@Controller()
export class OpenApiController {
  private readonly document: ReturnType<typeof buildOpenApiDocument>;

  constructor(@Inject(ENV) env: ApiEnv) {
    this.document = buildOpenApiDocument(allRoutes, {
      title: 'Playora API',
      version: '0.1.0',
      serverUrl: `${env.API_PUBLIC_URL}/v1`,
    });
  }

  @Public()
  @Get('openapi.json')
  spec() {
    return this.document;
  }
}
