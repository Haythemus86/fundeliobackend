import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateContributionDto {
  @IsUUID()
  fundraiserId!: string;

  @IsOptional()
  @IsUUID()
  contributorId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  guestName?: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  message?: string;
}
