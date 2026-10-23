import { Controller, Ip } from '@nestjs/common';
import { gamesApi, type RouteArgs } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { GamesService } from './games.service';

@Controller()
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Route(gamesApi.list)
  list(@Args() { params }: RouteArgs<typeof gamesApi.list>) {
    return this.games.list(params.orgId, params.eventId);
  }

  @Route(gamesApi.create)
  create(@Args() { params, body }: RouteArgs<typeof gamesApi.create>) {
    return this.games.create(params.orgId, params.eventId, body);
  }

  @Route(gamesApi.reorder)
  reorder(@Args() { params, body }: RouteArgs<typeof gamesApi.reorder>) {
    return this.games.reorder(params.orgId, params.eventId, body);
  }

  @Route(gamesApi.get)
  get(@Args() { params }: RouteArgs<typeof gamesApi.get>) {
    return this.games.get(params.orgId, params.gameId);
  }

  @Route(gamesApi.update)
  update(@Args() { params, body }: RouteArgs<typeof gamesApi.update>) {
    return this.games.update(params.orgId, params.gameId, body);
  }

  @Route(gamesApi.remove)
  remove(
    @Args() { params }: RouteArgs<typeof gamesApi.remove>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.games.remove(params.orgId, params.gameId, { userId: session.user.id, ip });
  }

  @Route(gamesApi.publish)
  publish(
    @Args() { params }: RouteArgs<typeof gamesApi.publish>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.games.publish(params.orgId, params.gameId, { userId: session.user.id, ip });
  }

  @Route(gamesApi.listVersions)
  listVersions(@Args() { params }: RouteArgs<typeof gamesApi.listVersions>) {
    return this.games.listVersions(params.orgId, params.gameId);
  }
}
