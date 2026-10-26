import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PlaysController, RehearsalPlaysController } from './plays.controller';
import { PlaysRepository } from './plays.repository';
import { PlaysService } from './plays.service';

@Module({
  imports: [BillingModule],
  controllers: [PlaysController, RehearsalPlaysController],
  providers: [PlaysRepository, PlaysService],
})
export class PlaysModule {}
