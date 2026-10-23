import { Controller, Ip } from '@nestjs/common';
import { guestsApi, type RouteArgs } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { GuestsService } from './guests.service';

@Controller()
export class GuestsController {
  constructor(private readonly guests: GuestsService) {}

  @Route(guestsApi.list)
  list(@Args() { params, query }: RouteArgs<typeof guestsApi.list>) {
    return this.guests.list(params.orgId, params.eventId, query);
  }

  @Route(guestsApi.preview)
  preview(@Args() { params, body }: RouteArgs<typeof guestsApi.preview>) {
    return this.guests.preview(params.orgId, params.eventId, body);
  }

  @Route(guestsApi.import)
  import(
    @Args() { params, body }: RouteArgs<typeof guestsApi.import>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.guests.import(params.orgId, params.eventId, body, {
      userId: session.user.id,
      ip,
    });
  }

  @Route(guestsApi.remove)
  remove(@Args() { params }: RouteArgs<typeof guestsApi.remove>) {
    return this.guests.remove(params.orgId, params.eventId, params.guestId);
  }

  @Route(guestsApi.clear)
  clear(
    @Args() { params }: RouteArgs<typeof guestsApi.clear>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.guests.clear(params.orgId, params.eventId, {
      userId: session.user.id,
      ip,
    });
  }

  @Route(guestsApi.listTeams)
  listTeams(@Args() { params }: RouteArgs<typeof guestsApi.listTeams>) {
    return this.guests.listTeams(params.orgId, params.eventId);
  }

  @Route(guestsApi.assignTeams)
  assignTeams(
    @Args() { params, body }: RouteArgs<typeof guestsApi.assignTeams>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.guests.assignTeams(params.orgId, params.eventId, body, {
      userId: session.user.id,
      ip,
    });
  }
}
