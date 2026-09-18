import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFundraiserDto {
  @IsUUID()
  creatorId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  hasGoal?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(0.01)
  goalAmount?: number;

  @IsOptional()
  @IsString()
  visibility?: 'PUBLIC' | 'PRIVATE';

  @IsOptional()
  @IsBoolean()
  hideContributions?: boolean;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
