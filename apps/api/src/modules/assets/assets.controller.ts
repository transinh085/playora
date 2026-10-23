import { Controller, Ip } from '@nestjs/common';
import { assetsApi, type RouteArgs } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { AssetsService } from './assets.service';

@Controller()
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Route(assetsApi.createUpload)
  createUpload(
    @Args() { params, body }: RouteArgs<typeof assetsApi.createUpload>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.assets.createUpload(params.orgId, body, { userId: session.user.id, ip });
  }

  @Route(assetsApi.completeUpload)
  completeUpload(@Args() { params, body }: RouteArgs<typeof assetsApi.completeUpload>) {
    return this.assets.completeUpload(params.orgId, params.assetId, body);
  }

  @Route(assetsApi.list)
  list(@Args() { params, query }: RouteArgs<typeof assetsApi.list>) {
    return this.assets.list(params.orgId, query);
  }

  @Route(assetsApi.get)
  get(@Args() { params }: RouteArgs<typeof assetsApi.get>) {
    return this.assets.get(params.orgId, params.assetId);
  }

  @Route(assetsApi.remove)
  remove(
    @Args() { params }: RouteArgs<typeof assetsApi.remove>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.assets.remove(params.orgId, params.assetId, { userId: session.user.id, ip });
  }
}
