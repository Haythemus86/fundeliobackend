import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccessFundraiserDto } from './dto/access-fundraiser.dto.js';
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

  async create(dto: CreateFundraiserDto, userId?: string) {
    if (!userId && !dto.guestAccess) {
      throw new UnauthorizedException(
        'Connectez-vous ou renseignez un accès invité',
      );
    }

    const hasGoal = dto.hasGoal ?? true;
    if (hasGoal && (!dto.goalAmount || dto.goalAmount <= 0)) {
      throw new BadRequestException('Un objectif positif est requis');
    }

    return this.prisma.$transaction(async (transaction) => {
      const fundraiser = await transaction.fundraiser.create({
        data: {
          ...(userId ? { creatorId: userId } : {}),
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

      if (!userId && dto.guestAccess) {
        await transaction.anonymousFundraiserAccess.create({
          data: {
            fundraiserId: fundraiser.id,
            email: dto.guestAccess.email.trim().toLowerCase(),
            passwordHash: await bcrypt.hash(dto.guestAccess.password, 12),
          },
        });
      }

      await transaction.activityLog.create({
        data: {
          fundraiserId: fundraiser.id,
          actorId: userId,
          type: 'FUNDRAISER_CREATED',
        },
      });
      return fundraiser;
    });
  }

  async access(dto: AccessFundraiserDto) {
    const accesses = await this.prisma.anonymousFundraiserAccess.findMany({
      where: { email: dto.email.trim().toLowerCase() },
      include: { fundraiser: { include: { category: true } } },
    });
    const validAccesses = [];
    for (const access of accesses) {
      if (await bcrypt.compare(dto.password, access.passwordHash)) {
        validAccesses.push(access.fundraiser);
      }
    }
    if (!validAccesses.length) {
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }
    return validAccesses;
  }

  async update(id: string, dto: UpdateFundraiserDto) {
    await this.findOne(id);
    return this.prisma.fundraiser.update({
      where: { id },
      data: {
        ...dto,
        creatorId: undefined,
        guestAccess: undefined,
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
