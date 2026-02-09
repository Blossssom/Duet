import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { GenerateRequest } from '@duet/shared';

class GenerateOptionsDto {
  @IsOptional()
  @IsBoolean()
  skipReview?: boolean;
}

export class GenerateDto implements GenerateRequest {
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GenerateOptionsDto)
  options?: GenerateOptionsDto;
}
