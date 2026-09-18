import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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

  @Post()
  create(@Body() dto: CreateFundraiserDto) {
    return this.fundraisersService.create(dto);
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
