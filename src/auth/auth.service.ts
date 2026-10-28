import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

const profilePhotoTypes = {
  'image/jpeg': {
    extension: 'jpg',
    signature: (buffer: Buffer) =>
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    signature: (buffer: Buffer) =>
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    extension: 'webp',
    signature: (buffer: Buffer) =>
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP',
  },
} as const;

export interface UploadedProfilePhoto {
  buffer: Buffer;
  mimetype: string;
}

const normalizeOptional = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value.trim() || null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new ConflictException('Cette adresse email est déjà utilisée');

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim(),
      },
    });
    return {
      accessToken: this.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      user: this.serializeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user ||
      user.deletedAt ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }
    return {
      accessToken: this.jwt.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      user: this.serializeUser(user),
    };
  }

  async getProfile(userId: string) {
    return this.serializeUser(await this.findActiveUser(userId));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: Prisma.UserUpdateInput = {};
    if (dto.firstName !== undefined) {
      const firstName = dto.firstName.trim();
      if (!firstName) throw new BadRequestException('Le prénom est requis');
      data.firstName = firstName;
    }
    if (dto.lastName !== undefined) {
      const lastName = dto.lastName.trim();
      if (!lastName) throw new BadRequestException('Le nom est requis');
      data.lastName = lastName;
    }

    const optionalFields = [
      'phone',
      'salutation',
      'birthCity',
      'nationality',
      'countryOfBirth',
      'countryOfResidence',
      'profession',
      'incomeRange',
      'streetAddress',
      'city',
      'postalCode',
    ] as const;
    for (const field of optionalFields) {
      const value = normalizeOptional(dto[field]);
      if (value !== undefined) data[field] = value;
    }
    if (dto.birthDate !== undefined) {
      data.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.serializeUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.findActiveUser(userId);
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Le mot de passe actuel est invalide');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    });
    return { message: 'Mot de passe modifié' };
  }

  async saveProfilePhoto(userId: string, file: UploadedProfilePhoto) {
    if (!file?.buffer?.length || file.buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('La photo doit faire 5 Mo maximum');
    }

    const photoType = Object.entries(profilePhotoTypes).find(([, type]) =>
      type.signature(file.buffer),
    );
    if (!photoType || photoType[0] !== file.mimetype) {
      throw new BadRequestException('Formats acceptés : JPEG, PNG ou WebP');
    }

    const user = await this.findActiveUser(userId);
    const mimeType = photoType[0];
    const fileName = `${userId}-${randomUUID()}.${photoType[1].extension}`;
    const newPath = this.profilePhotoPath(userId, fileName);
    await mkdir(this.profilePhotoDirectory(), { recursive: true });
    await writeFile(newPath, file.buffer, { mode: 0o600 });

    let updated: User;
    try {
      updated = await this.prisma.user.update({
        where: { id: userId },
        data: { profilePhotoFile: fileName, profilePhotoMime: mimeType },
      });
    } catch (error) {
      await rm(newPath, { force: true });
      throw error;
    }
    if (user.profilePhotoFile) {
      await rm(this.profilePhotoPath(userId, user.profilePhotoFile), {
        force: true,
      });
    }
    return this.serializeUser(updated);
  }

  async getProfilePhoto(userId: string) {
    const user = await this.findActiveUser(userId);
    if (!user.profilePhotoMime || !user.profilePhotoFile) {
      throw new NotFoundException('Aucune photo de profil');
    }

    try {
      return {
        buffer: await readFile(
          this.profilePhotoPath(userId, user.profilePhotoFile),
        ),
        mimeType: user.profilePhotoMime,
      };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        throw new NotFoundException('Aucune photo de profil');
      }
      throw error;
    }
  }

  async removeProfilePhoto(userId: string) {
    const user = await this.findActiveUser(userId);
    if (user.profilePhotoFile) {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { profilePhotoFile: null, profilePhotoMime: null },
      });
      await rm(this.profilePhotoPath(userId, user.profilePhotoFile), {
        force: true,
      });
      return this.serializeUser(updated);
    }
    return this.serializeUser(user);
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.findActiveUser(userId);
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Le mot de passe actuel est invalide');
    }

    if (user.profilePhotoFile) {
      await rm(this.profilePhotoPath(userId, user.profilePhotoFile), {
        force: true,
      });
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.contribution.updateMany({
        where: { contributorId: userId },
        data: { contributorId: null, guestName: null, guestEmail: null },
      });
      await transaction.activityLog.updateMany({
        where: { actorId: userId },
        data: { actorId: null },
      });
      await transaction.fundraiser.updateMany({
        where: { creatorId: userId },
        data: { creatorId: null },
      });
      await transaction.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`,
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
          firstName: 'Compte',
          lastName: 'supprimé',
          phone: null,
          salutation: null,
          birthDate: null,
          birthCity: null,
          nationality: null,
          countryOfBirth: null,
          countryOfResidence: null,
          profession: null,
          incomeRange: null,
          streetAddress: null,
          city: null,
          postalCode: null,
          profilePhotoFile: null,
          profilePhotoMime: null,
          emailVerifiedAt: null,
          deletedAt: new Date(),
        },
      });
    });
    return { message: 'Compte supprimé et données personnelles anonymisées' };
  }

  private async findActiveUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('Compte introuvable');
    return user;
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      salutation: user.salutation,
      birthDate: user.birthDate,
      birthCity: user.birthCity,
      nationality: user.nationality,
      countryOfBirth: user.countryOfBirth,
      countryOfResidence: user.countryOfResidence,
      profession: user.profession,
      incomeRange: user.incomeRange,
      streetAddress: user.streetAddress,
      city: user.city,
      postalCode: user.postalCode,
      hasProfilePhoto: Boolean(user.profilePhotoMime && user.profilePhotoFile),
      role: user.role,
    };
  }

  private profilePhotoDirectory() {
    return join(process.cwd(), 'uploads', 'profile-photos');
  }

  private profilePhotoPath(userId: string, fileName: string) {
    const extension = fileName.split('.').pop();
    const validExtension = Object.values(profilePhotoTypes).some(
      (type) => type.extension === extension,
    );
    if (!fileName.startsWith(`${userId}-`) || !validExtension) {
      throw new BadRequestException('Photo de profil invalide');
    }
    return join(this.profilePhotoDirectory(), fileName);
  }
}
