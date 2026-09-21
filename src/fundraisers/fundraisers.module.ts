import { Module } from '@nestjs/common';
import { FundraisersController } from './fundraisers.controller.js';
import { FundraisersService } from './fundraisers.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [FundraisersController],
  providers: [FundraisersService],
})
export class FundraisersModule {}
