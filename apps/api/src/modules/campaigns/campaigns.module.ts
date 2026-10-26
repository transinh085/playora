import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsRepository } from './campaigns.repository';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [BillingModule],
  controllers: [CampaignsController],
  providers: [CampaignsRepository, CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
