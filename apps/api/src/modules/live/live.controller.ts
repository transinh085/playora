import { Controller } from '@nestjs/common';
import { liveApi, type RouteArgs } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { LiveService } from './live.service';

@Controller()
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Route(liveApi.ticket)
  ticket(
    @Args() { params }: RouteArgs<typeof liveApi.ticket>,
    @CurrentSession() session: AuthSession,
  ) {
    return this.live.issueHostTicket(params.orgId, params.eventId, session.user.id);
  }
}
