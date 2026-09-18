import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFundraiserDto } from './dto/create-fundraiser.dto.js';
import { UpdateFundraiserDto } from './dto/update-fundraiser.dto.js';

@Injectable()
export class FundraisersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(creatorId?: string) {
    return this.prisma.fundraiser.findMany({
      where: {
        deletedAt: null,
        ...(creatorId ? { creatorId } : { visibility: 'PUBLIC' }),
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const fundraiser = await this.prisma.fundraiser.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        contributions: {
          where: { status: 'CONFIRMED' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!fundraiser) throw new NotFoundException('Cagnotte introuvable');
    return fundraiser;
  }

  async create(dto: CreateFundraiserDto) {
    const hasGoal = dto.hasGoal ?? true;
    if (hasGoal && (!dto.goalAmount || dto.goalAmount <= 0)) {
      throw new BadRequestException('Un objectif positif est requis');
    }

    return this.prisma.$transaction(async (transaction) => {
      const fundraiser = await transaction.fundraiser.create({
        data: {
          creatorId: dto.creatorId,
          categoryId: dto.categoryId,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? '',
          hasGoal,
          goalAmount: hasGoal ? dto.goalAmount : null,
          visibility: dto.visibility ?? 'PUBLIC',
          hideContributions: dto.hideContributions ?? false,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          photoUrl: dto.photoUrl,
          emoji: dto.emoji,
          color: dto.color,
        },
        include: { category: true },
      });
      await transaction.activityLog.create({
        data: {
          fundraiserId: fundraiser.id,
          actorId: dto.creatorId,
          type: 'FUNDRAISER_CREATED',
        },
      });
      return fundraiser;
    });
  }

  async update(id: string, dto: UpdateFundraiserDto) {
    await this.findOne(id);
    return this.prisma.fundraiser.update({
      where: { id },
      data: {
        ...dto,
        creatorId: undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.fundraiser.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }
}
