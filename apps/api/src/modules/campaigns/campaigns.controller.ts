import { Controller, Ip } from '@nestjs/common';
import { campaignsApi, type RouteArgs } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { CampaignsService } from './campaigns.service';

/**
 * Campaign facade over events + games + prizes (ADR-015). `campaignsApi.rehearsalPlay` is bound
 * by the play engine module, not here.
 */
@Controller()
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Route(campaignsApi.list)
  list(@Args() { params, query }: RouteArgs<typeof campaignsApi.list>) {
    return this.campaigns.list(params.orgId, query);
  }

  @Route(campaignsApi.create)
  create(@Args() { params, body }: RouteArgs<typeof campaignsApi.create>) {
    return this.campaigns.create(params.orgId, body);
  }

  @Route(campaignsApi.get)
  get(@Args() { params }: RouteArgs<typeof campaignsApi.get>) {
    return this.campaigns.get(params.orgId, params.campaignId);
  }

  @Route(campaignsApi.update)
  update(@Args() { params, body }: RouteArgs<typeof campaignsApi.update>) {
    return this.campaigns.update(params.orgId, params.campaignId, body);
  }

  @Route(campaignsApi.remove)
  remove(
    @Args() { params }: RouteArgs<typeof campaignsApi.remove>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.campaigns.remove(params.orgId, params.campaignId, { userId: session.user.id, ip });
  }

  @Route(campaignsApi.publish)
  publish(
    @Args() { params }: RouteArgs<typeof campaignsApi.publish>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.campaigns.publish(params.orgId, params.campaignId, { userId: session.user.id, ip });
  }

  @Route(campaignsApi.pause)
  pause(
    @Args() { params }: RouteArgs<typeof campaignsApi.pause>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.campaigns.pause(params.orgId, params.campaignId, { userId: session.user.id, ip });
  }

  @Route(campaignsApi.resume)
  resume(
    @Args() { params }: RouteArgs<typeof campaignsApi.resume>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.campaigns.resume(params.orgId, params.campaignId, { userId: session.user.id, ip });
  }

  @Route(campaignsApi.end)
  end(
    @Args() { params }: RouteArgs<typeof campaignsApi.end>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.campaigns.end(params.orgId, params.campaignId, { userId: session.user.id, ip });
  }

  @Route(campaignsApi.plays)
  plays(@Args() { params, query }: RouteArgs<typeof campaignsApi.plays>) {
    return this.campaigns.plays(params.orgId, params.campaignId, query);
  }

  @Route(campaignsApi.vouchers)
  vouchers(@Args() { params, query }: RouteArgs<typeof campaignsApi.vouchers>) {
    return this.campaigns.vouchers(params.orgId, params.campaignId, query);
  }

  @Route(campaignsApi.stats)
  stats(@Args() { params }: RouteArgs<typeof campaignsApi.stats>) {
    return this.campaigns.stats(params.orgId, params.campaignId);
  }
}
