import { Module } from '@nestjs/common';
import { AdminBillingController, BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';

@Module({
  controllers: [BillingController, AdminBillingController],
  providers: [BillingRepository, BillingService],
  exports: [BillingService],
})
export class BillingModule {}
