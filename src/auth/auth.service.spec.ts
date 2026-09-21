import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const bcrypt = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('bcrypt', () => bcrypt);

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  } as unknown as PrismaService;
  const jwt = {
    sign: vi.fn(() => 'signed-token'),
  } as unknown as JwtService;
  const service = new AuthService(prisma, jwt);

  it('enregistre un utilisateur avec un email normalisé et un mot de passe haché', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed-password' as never);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Alice',
      lastName: 'Martin',
      role: 'USER',
    } as never);

    const result = await service.register({
      email: ' Alice@Example.com ',
      password: 'motdepasse',
      firstName: ' Alice ',
      lastName: ' Martin ',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'alice@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Alice',
        lastName: 'Martin',
        phone: undefined,
      },
    });
    expect(result).toMatchObject({ accessToken: 'signed-token' });
  });

  it('refuse une adresse déjà utilisée', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as never);

    await expect(
      service.register({
        email: 'alice@example.com',
        password: 'motdepasse',
        firstName: 'Alice',
        lastName: 'Martin',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse un mauvais mot de passe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
    } as never);
    bcrypt.compare.mockResolvedValue(false as never);

    await expect(
      service.login({ email: 'alice@example.com', password: 'wrongpass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
