import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsRepository } from './campaigns.repository';
import { CampaignsService } from './campaigns.service';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsRepository, CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
