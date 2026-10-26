import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller';
import { VouchersRepository } from './vouchers.repository';
import { VouchersService } from './vouchers.service';

@Module({
  controllers: [VouchersController],
  providers: [VouchersRepository, VouchersService],
})
export class VouchersModule {}
