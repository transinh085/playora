import { Module } from '@nestjs/common';
import { PlaysController, RehearsalPlaysController } from './plays.controller';
import { PlaysRepository } from './plays.repository';
import { PlaysService } from './plays.service';

@Module({
  controllers: [PlaysController, RehearsalPlaysController],
  providers: [PlaysRepository, PlaysService],
})
export class PlaysModule {}
