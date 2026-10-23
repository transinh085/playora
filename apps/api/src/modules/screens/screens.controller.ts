import { Controller, Headers, Ip } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { type RouteArgs, screensApi } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { ScreensService } from './screens.service';

@Controller()
export class ScreensController {
  constructor(private readonly screens: ScreensService) {}

  @Route(screensApi.list)
  list(@Args() { params }: RouteArgs<typeof screensApi.list>) {
    return this.screens.list(params.orgId, params.eventId);
  }

  @Route(screensApi.create)
  create(
    @Args() { params, body }: RouteArgs<typeof screensApi.create>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.screens.create(params.orgId, params.eventId, body, {
      userId: session.user.id,
      ip,
    });
  }

  @Route(screensApi.update)
  update(@Args() { params, body }: RouteArgs<typeof screensApi.update>) {
    return this.screens.update(params.orgId, params.eventId, params.screenId, body);
  }

  @Route(screensApi.revoke)
  revoke(
    @Args() { params }: RouteArgs<typeof screensApi.revoke>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.screens.revoke(params.orgId, params.eventId, params.screenId, {
      userId: session.user.id,
      ip,
    });
  }

  @Route(screensApi.rotate)
  rotate(
    @Args() { params }: RouteArgs<typeof screensApi.rotate>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.screens.rotate(params.orgId, params.eventId, params.screenId, {
      userId: session.user.id,
      ip,
    });
  }

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Route(screensApi.session)
  session(@Headers('x-screen-key') screenKey: string | undefined) {
    return this.screens.session(screenKey);
  }
}
