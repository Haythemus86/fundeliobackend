import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service.js';
import type { UploadedProfilePhoto } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(request.user.sub, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(request.user.sub, dto);
  }

  @Post('me/profile-photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
        ) {
          callback(
            new BadRequestException('Formats acceptés : JPEG, PNG ou WebP'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadProfilePhoto(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: UploadedProfilePhoto | undefined,
  ) {
    if (!file) throw new BadRequestException('Une photo est requise');
    return this.authService.saveProfilePhoto(request.user.sub, file);
  }

  @Get('me/profile-photo')
  @UseGuards(JwtAuthGuard)
  async getProfilePhoto(@Req() request: AuthenticatedRequest) {
    const photo = await this.authService.getProfilePhoto(request.user.sub);
    return new StreamableFile(photo.buffer, {
      type: photo.mimeType,
      disposition: 'inline',
    });
  }

  @Delete('me/profile-photo')
  @UseGuards(JwtAuthGuard)
  removeProfilePhoto(@Req() request: AuthenticatedRequest) {
    return this.authService.removeProfilePhoto(request.user.sub);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteAccount(
    @Req() request: AuthenticatedRequest,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.authService.deleteAccount(request.user.sub, dto);
  }
}
