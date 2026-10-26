import { Controller, Ip } from '@nestjs/common';
import { adminApi, billingApi, type RouteArgs } from '@playora/contracts';
import type { AuthSession } from '../../common/auth/auth.types';
import { CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { BillingService } from './billing.service';

/** Plan, limits and usage of an organization (BIL-01/02). */
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Route(billingApi.get)
  get(@Args() { params }: RouteArgs<typeof billingApi.get>) {
    return this.billing.get(params.orgId);
  }
}

/** Platform back-office: manual plan activation and invoices (`platformAdmin` routes). */
@Controller()
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Route(adminApi.orgs)
  orgs(@Args() { query }: RouteArgs<typeof adminApi.orgs>) {
    return this.billing.adminListOrgs(query);
  }

  @Route(adminApi.setSubscription)
  setSubscription(
    @Args() { params, body }: RouteArgs<typeof adminApi.setSubscription>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.billing.adminSetSubscription(params.orgId, body, { userId: session.user.id, ip });
  }

  @Route(adminApi.recordInvoice)
  recordInvoice(
    @Args() { params, body }: RouteArgs<typeof adminApi.recordInvoice>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.billing.adminRecordInvoice(params.orgId, body, { userId: session.user.id, ip });
  }
}
