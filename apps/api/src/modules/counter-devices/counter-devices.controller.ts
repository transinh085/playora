import { Controller, Ip } from '@nestjs/common';
import { counterDevicesApi, type RouteArgs } from '@playora/contracts';
import type { AuthSession, CounterDeviceActor } from '../../common/auth/auth.types';
import { CurrentCounterDevice, CurrentSession } from '../../common/auth/decorators';
import { Args, Route } from '../../common/contract/route.decorator';
import { CounterDevicesService } from './counter-devices.service';

@Controller()
export class CounterDevicesController {
  constructor(private readonly counterDevices: CounterDevicesService) {}

  @Route(counterDevicesApi.list)
  list(@Args() { params }: RouteArgs<typeof counterDevicesApi.list>) {
    return this.counterDevices.list(params.orgId);
  }

  @Route(counterDevicesApi.create)
  create(
    @Args() { params, body }: RouteArgs<typeof counterDevicesApi.create>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.counterDevices.create(params.orgId, body, { userId: session.user.id, ip });
  }

  @Route(counterDevicesApi.revoke)
  revoke(
    @Args() { params }: RouteArgs<typeof counterDevicesApi.revoke>,
    @CurrentSession() session: AuthSession,
    @Ip() ip: string,
  ) {
    return this.counterDevices.revoke(params.orgId, params.deviceId, {
      userId: session.user.id,
      ip,
    });
  }

  @Route(counterDevicesApi.pair)
  pair(@Args() { body }: RouteArgs<typeof counterDevicesApi.pair>, @Ip() ip: string) {
    return this.counterDevices.pair(body, ip);
  }

  @Route(counterDevicesApi.me)
  me(
    @Args() { params }: RouteArgs<typeof counterDevicesApi.me>,
    @CurrentCounterDevice() counterDevice: CounterDeviceActor | null,
  ) {
    return this.counterDevices.me(params.orgId, counterDevice);
  }
}
