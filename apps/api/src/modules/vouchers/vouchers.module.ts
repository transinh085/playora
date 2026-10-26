import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { VouchersController } from './vouchers.controller';
import { VouchersRepository } from './vouchers.repository';
import { VouchersService } from './vouchers.service';

@Module({
  imports: [BillingModule],
  controllers: [VouchersController],
  providers: [VouchersRepository, VouchersService],
})
export class VouchersModule {}
