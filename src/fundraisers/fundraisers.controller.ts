import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard.js';
import { AccessFundraiserDto } from './dto/access-fundraiser.dto.js';
import { CreateFundraiserDto } from './dto/create-fundraiser.dto.js';
import { UpdateFundraiserDto } from './dto/update-fundraiser.dto.js';
import { FundraisersService } from './fundraisers.service.js';

@Controller('fundraisers')
export class FundraisersController {
  constructor(private readonly fundraisersService: FundraisersService) {}

  @Get()
  findAll(@Query('creatorId') creatorId?: string) {
    return this.fundraisersService.findAll(creatorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fundraisersService.findOne(id);
  }

  @Post('access')
  access(@Body() dto: AccessFundraiserDto) {
    return this.fundraisersService.access(dto);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(
    @Body() dto: CreateFundraiserDto,
    @Req() request: Request & { user?: { sub?: string } },
  ) {
    return this.fundraisersService.create(dto, request.user?.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFundraiserDto) {
    return this.fundraisersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fundraisersService.remove(id);
  }
}
