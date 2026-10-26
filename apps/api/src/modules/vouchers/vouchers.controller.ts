import { Controller, Ip } from '@nestjs/common';
import { type RouteArgs, vouchersApi } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { VouchersService } from './vouchers.service';

/** Counter redemption (docs/product/specs/prizes-redemption.md §6). */
@Controller()
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Route(vouchersApi.lookup)
  lookup(@Args() { params }: RouteArgs<typeof vouchersApi.lookup>) {
    return this.vouchers.lookup(params.orgId, params.code);
  }

  @Route(vouchersApi.redeem)
  redeem(
    @Args() { params }: RouteArgs<typeof vouchersApi.redeem>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.vouchers.redeem(params.orgId, params.code, { userId: session.user.id, ip });
  }

  @Route(vouchersApi.reopen)
  reopen(
    @Args() { params, body }: RouteArgs<typeof vouchersApi.reopen>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.vouchers.reopen(params.orgId, params.code, body.reason, {
      userId: session.user.id,
      ip,
    });
  }
}
