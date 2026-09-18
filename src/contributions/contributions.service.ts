import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateContributionDto } from './dto/create-contribution.dto.js';

@Injectable()
export class ContributionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContributionDto) {
    const fundraiser = await this.prisma.fundraiser.findFirst({
      where: { id: dto.fundraiserId, status: 'ACTIVE', deletedAt: null },
    });
    if (!fundraiser)
      throw new NotFoundException('Cagnotte introuvable ou inactive');
    const contribution = await this.prisma.contribution.create({
      data: {
        ...dto,
        status: 'PENDING',
        guestEmail: dto.guestEmail?.trim().toLowerCase(),
      },
    });
    await this.prisma.activityLog.create({
      data: {
        fundraiserId: dto.fundraiserId,
        actorId: dto.contributorId,
        type: 'CONTRIBUTION_CREATED',
        metadata: { contributionId: contribution.id },
      },
    });
    return contribution;
  }

  findForFundraiser(fundraiserId: string) {
    return this.prisma.contribution.findMany({
      where: { fundraiserId, status: 'CONFIRMED' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
