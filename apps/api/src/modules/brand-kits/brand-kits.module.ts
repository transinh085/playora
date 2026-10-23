import { Module } from '@nestjs/common';
import { BrandKitsController } from './brand-kits.controller';
import { BrandKitsRepository } from './brand-kits.repository';
import { BrandKitsService } from './brand-kits.service';

@Module({
  controllers: [BrandKitsController],
  providers: [BrandKitsRepository, BrandKitsService],
  exports: [BrandKitsService],
})
export class BrandKitsModule {}
