import { Module } from '@nestjs/common';
import { FundraisersController } from './fundraisers.controller.js';
import { FundraisersService } from './fundraisers.service.js';

@Module({
  controllers: [FundraisersController],
  providers: [FundraisersService],
})
export class FundraisersModule {}
