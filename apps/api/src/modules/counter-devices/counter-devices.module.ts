import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { CounterDevicesController } from './counter-devices.controller';
import { CounterDevicesRepository } from './counter-devices.repository';
import { CounterDevicesService } from './counter-devices.service';

@Module({
  imports: [BillingModule],
  controllers: [CounterDevicesController],
  providers: [CounterDevicesRepository, CounterDevicesService],
})
export class CounterDevicesModule {}
