import { PartialType } from '@nestjs/mapped-types';
import { CreateFundraiserDto } from './create-fundraiser.dto.js';

export class UpdateFundraiserDto extends PartialType(CreateFundraiserDto) {}
