import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { ScreensController } from './screens.controller';
import { ScreensRepository } from './screens.repository';
import { ScreensService } from './screens.service';

@Module({
  imports: [AssetsModule],
  controllers: [ScreensController],
  providers: [ScreensRepository, ScreensService],
  exports: [ScreensService],
})
export class ScreensModule {}
