import { Module } from '@nestjs/common';
import { ContributionsController } from './contributions.controller.js';
import { ContributionsService } from './contributions.service.js';

@Module({
  controllers: [ContributionsController],
  providers: [ContributionsService],
})
export class ContributionsModule {}
