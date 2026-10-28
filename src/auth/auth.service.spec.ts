import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

const bcrypt = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));
const fileSystem = vi.hoisted(() => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('bcrypt', () => bcrypt);
vi.mock('node:fs/promises', () => fileSystem);

const transaction = {
  activityLog: { updateMany: vi.fn() },
  contribution: { updateMany: vi.fn() },
  fundraiser: { updateMany: vi.fn() },
  user: { update: vi.fn() },
};

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  } as unknown as PrismaService;
  const jwt = {
    sign: vi.fn(() => 'signed-token'),
  } as unknown as JwtService;
  const service = new AuthService(prisma, jwt);

  beforeEach(() => {
    vi.clearAllMocks();
    bcrypt.hash.mockResolvedValue('hashed-password' as never);
    bcrypt.compare.mockResolvedValue(true as never);
  });

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
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'existing',
    } as never);

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

  it('renvoie le profil sans exposer le hachage du mot de passe', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      passwordHash: 'secret-hash',
      firstName: 'Alice',
      lastName: 'Martin',
      role: 'USER',
      profilePhotoFile: 'photo.png',
      profilePhotoMime: 'image/png',
    } as never);

    const result = await service.getProfile('user-1');

    expect(result).toMatchObject({
      id: 'user-1',
      email: 'alice@example.com',
      hasProfilePhoto: true,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', deletedAt: null },
    });
  });

  it('normalise et enregistre les informations facultatives du profil', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Martin',
      role: 'USER',
    } as never);

    await service.updateProfile('user-1', {
      firstName: ' Alice ',
      city: ' Lyon ',
      profession: '',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { firstName: 'Alice', city: 'Lyon', profession: null },
    });
  });

  it('ne change pas le mot de passe si le mot de passe actuel est incorrect', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'user-1',
      passwordHash: 'old-hash',
      profilePhotoFile: null,
    } as never);
    bcrypt.compare.mockResolvedValue(false as never);

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('valide le contenu binaire de la photo avant stockage', async () => {
    await expect(
      service.saveProfilePhoto('user-1', {
        buffer: Buffer.from('not an image'),
        mimetype: 'image/png',
      }),
    ).rejects.toThrow('Formats acceptés');
    expect(fileSystem.writeFile).not.toHaveBeenCalled();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('enregistre une photo PNG avec un nom généré par le serveur', async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'user-1',
      profilePhotoFile: null,
      profilePhotoMime: null,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Martin',
      profilePhotoFile: 'user-1-generated.png',
      profilePhotoMime: 'image/png',
      role: 'USER',
    } as never);

    const result = await service.saveProfilePhoto('user-1', {
      buffer: png,
      mimetype: 'image/png',
    });

    expect(result).toMatchObject({ hasProfilePhoto: true });
    expect(fileSystem.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/user-1-[0-9a-f-]+\.png$/),
      png,
      { mode: 0o600 },
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        profilePhotoFile: expect.stringMatching(/user-1-[0-9a-f-]+\.png$/),
        profilePhotoMime: 'image/png',
      },
    });
  });

  it('anonymise les informations personnelles tout en préservant les enregistrements', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'user-1',
      passwordHash: 'old-hash',
      profilePhotoFile: 'user-1-photo.png',
      profilePhotoMime: 'image/png',
    } as never);

    await service.deleteAccount('user-1', {
      currentPassword: 'current-password',
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(transaction.contribution.updateMany).toHaveBeenCalledWith({
      where: { contributorId: 'user-1' },
      data: { contributorId: null, guestName: null, guestEmail: null },
    });
    expect(transaction.fundraiser.updateMany).toHaveBeenCalledWith({
      where: { creatorId: 'user-1' },
      data: { creatorId: null },
    });
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        email: 'deleted-user-1@deleted.invalid',
        firstName: 'Compte',
        lastName: 'supprimé',
        profilePhotoFile: null,
        profilePhotoMime: null,
      }),
    });
    expect(fileSystem.rm).toHaveBeenCalled();
  });
});
