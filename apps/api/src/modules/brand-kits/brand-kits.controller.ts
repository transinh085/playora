import { Controller, Ip } from '@nestjs/common';
import { brandKitsApi, type RouteArgs } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { BrandKitsService } from './brand-kits.service';

@Controller()
export class BrandKitsController {
  constructor(private readonly brandKits: BrandKitsService) {}

  @Route(brandKitsApi.list)
  list(@Args() { params, query }: RouteArgs<typeof brandKitsApi.list>) {
    return this.brandKits.list(params.orgId, query);
  }

  @Route(brandKitsApi.create)
  create(@Args() { params, body }: RouteArgs<typeof brandKitsApi.create>) {
    return this.brandKits.create(params.orgId, body);
  }

  @Route(brandKitsApi.get)
  get(@Args() { params }: RouteArgs<typeof brandKitsApi.get>) {
    return this.brandKits.get(params.orgId, params.brandKitId);
  }

  @Route(brandKitsApi.update)
  update(@Args() { params, body }: RouteArgs<typeof brandKitsApi.update>) {
    return this.brandKits.update(params.orgId, params.brandKitId, body);
  }

  @Route(brandKitsApi.remove)
  remove(
    @Args() { params }: RouteArgs<typeof brandKitsApi.remove>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.brandKits.remove(params.orgId, params.brandKitId, {
      userId: session.user.id,
      ip,
    });
  }
}
