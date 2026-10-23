import { Controller, Ip } from '@nestjs/common';
import { eventsApi, type RouteArgs } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { EventsService } from './events.service';

/** Reference module: contract-bound routes → service → org-scoped repository. */
@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Route(eventsApi.list)
  list(@Args() { params, query }: RouteArgs<typeof eventsApi.list>) {
    return this.events.list(params.orgId, query);
  }

  @Route(eventsApi.create)
  create(@Args() { params, body }: RouteArgs<typeof eventsApi.create>) {
    return this.events.create(params.orgId, body);
  }

  @Route(eventsApi.get)
  get(@Args() { params }: RouteArgs<typeof eventsApi.get>) {
    return this.events.get(params.orgId, params.eventId);
  }

  @Route(eventsApi.update)
  update(@Args() { params, body }: RouteArgs<typeof eventsApi.update>) {
    return this.events.update(params.orgId, params.eventId, body);
  }

  @Route(eventsApi.remove)
  remove(
    @Args() { params }: RouteArgs<typeof eventsApi.remove>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.events.remove(params.orgId, params.eventId, { userId: session.user.id, ip });
  }
}
