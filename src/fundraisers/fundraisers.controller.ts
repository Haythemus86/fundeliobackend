import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AccessFundraiserDto } from './dto/access-fundraiser.dto.js';
import { CreateFundraiserDto } from './dto/create-fundraiser.dto.js';
import { UpdateFundraiserDto } from './dto/update-fundraiser.dto.js';
import { FundraisersService } from './fundraisers.service.js';

@Controller('fundraisers')
export class FundraisersController {
  constructor(private readonly fundraisersService: FundraisersService) {}

  @Get()
  findAll() {
    return this.fundraisersService.findAll();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() request: AuthenticatedRequest) {
    return this.fundraisersService.findMine(request.user.sub);
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
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFundraiserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.fundraisersService.updateOwned(id, request.user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.fundraisersService.removeOwned(id, request.user.sub);
  }
}
