import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateContributionDto } from './dto/create-contribution.dto.js';
import { ContributionsService } from './contributions.service.js';

@Controller('contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  create(@Body() dto: CreateContributionDto) {
    return this.contributionsService.create(dto);
  }

  @Get('fundraiser/:fundraiserId')
  findForFundraiser(@Param('fundraiserId') fundraiserId: string) {
    return this.contributionsService.findForFundraiser(fundraiserId);
  }
}
