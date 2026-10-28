import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { FundraisersService } from './fundraisers.service.js';

describe('FundraisersService account access', () => {
  const prisma = {
    fundraiser: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaService;
  const service = new FundraisersService(prisma);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('limits public listing to public fundraisers', async () => {
    vi.mocked(prisma.fundraiser.findMany).mockResolvedValue([] as never);

    await service.findAll();

    expect(prisma.fundraiser.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, visibility: 'PUBLIC' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns only the authenticated creator’s fundraisers', async () => {
    vi.mocked(prisma.fundraiser.findMany).mockResolvedValue([] as never);

    await service.findMine('user-1');

    expect(prisma.fundraiser.findMany).toHaveBeenCalledWith({
      where: { creatorId: 'user-1', deletedAt: null },
      include: {
        category: true,
        contributions: {
          where: { status: 'CONFIRMED' },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('does not update a fundraiser owned by another user', async () => {
    vi.mocked(prisma.fundraiser.findFirst).mockResolvedValue(null);

    await expect(
      service.updateOwned('fundraiser-1', 'user-1', { title: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.fundraiser.update).not.toHaveBeenCalled();
  });

  it('clears the optional end date when the owner edits a fundraiser', async () => {
    vi.mocked(prisma.fundraiser.findFirst).mockResolvedValue({
      id: 'fundraiser-1',
    } as never);
    vi.mocked(prisma.fundraiser.update).mockResolvedValue({} as never);

    await service.updateOwned('fundraiser-1', 'user-1', { endDate: null });

    expect(prisma.fundraiser.update).toHaveBeenCalledWith({
      where: { id: 'fundraiser-1' },
      data: {
        endDate: null,
        creatorId: undefined,
        guestAccess: undefined,
      },
      include: { category: true },
    });
  });

  it('does not delete a fundraiser owned by another user', async () => {
    vi.mocked(prisma.fundraiser.findFirst).mockResolvedValue(null);

    await expect(
      service.removeOwned('fundraiser-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.fundraiser.update).not.toHaveBeenCalled();
  });
});
