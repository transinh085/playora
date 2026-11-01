import { Controller, Ip } from '@nestjs/common';
import { campaignsApi, playsApi, type RouteArgs } from '@playora/contracts';
import type { PlayerSessionClaims } from '@playora/core/session';
import { CurrentPlayer } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { PlaysService } from './plays.service';

/** Player routes of a published campaign (`/p/:slug/…`, player session token). */
@Controller()
export class PlaysController {
  constructor(private readonly plays: PlaysService) {}

  @Route(playsApi.campaign)
  campaign(@Args() { params }: RouteArgs<typeof playsApi.campaign>) {
    return this.plays.getCampaign(params.slug);
  }

  @Route(playsApi.play)
  play(
    @Args() { params, body }: RouteArgs<typeof playsApi.play>,
    @CurrentPlayer() player: PlayerSessionClaims,
    @Ip() ip: string,
  ) {
    return this.plays.play(params.slug, player, body, ip);
  }

  @Route(playsApi.me)
  me(
    @Args() { params }: RouteArgs<typeof playsApi.me>,
    @CurrentPlayer() player: PlayerSessionClaims,
  ) {
    return this.plays.me(params.slug, player);
  }

  @Route(playsApi.restorePrizes)
  restorePrizes(
    @Args() { params, body }: RouteArgs<typeof playsApi.restorePrizes>,
    @Ip() ip: string,
  ) {
    return this.plays.restorePrizes(params.slug, body, ip);
  }

  @Route(playsApi.draftCampaign)
  draftCampaign(@Args() { params }: RouteArgs<typeof playsApi.draftCampaign>) {
    return this.plays.getDraftCampaign(params.token);
  }

  @Route(playsApi.draftPlay)
  draftPlay(@Args() { params, body }: RouteArgs<typeof playsApi.draftPlay>) {
    return this.plays.draftPlay(params.token, body);
  }

  @Route(playsApi.draftReset)
  draftReset(@Args() { params, body }: RouteArgs<typeof playsApi.draftReset>) {
    return this.plays.draftReset(params.token, body);
  }
}

/** Studio rehearsal plays and share link on the draft (`campaignsApi.rehearsalPlay`, `campaignsApi.rehearsalLink`). */
@Controller()
export class RehearsalPlaysController {
  constructor(private readonly plays: PlaysService) {}

  @Route(campaignsApi.rehearsalPlay)
  rehearsalPlay(@Args() { params, body }: RouteArgs<typeof campaignsApi.rehearsalPlay>) {
    return this.plays.rehearsalPlay(params.orgId, params.campaignId, body);
  }

  @Route(campaignsApi.rehearsalLink)
  rehearsalLink(@Args() { params, body }: RouteArgs<typeof campaignsApi.rehearsalLink>) {
    return this.plays.rehearsalLink(params.orgId, params.campaignId, body);
  }
}
