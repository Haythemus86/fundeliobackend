import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { FundraisersModule } from './fundraisers/fundraisers.module.js';
import { ContributionsModule } from './contributions/contributions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    FundraisersModule,
    ContributionsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
