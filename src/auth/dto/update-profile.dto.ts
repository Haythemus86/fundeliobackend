import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  salutation?: string | null;

  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  birthCity?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  countryOfBirth?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  countryOfResidence?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  profession?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  incomeRange?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  streetAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;
}
