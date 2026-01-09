import { IsOptional, IsString, IsDateString, IsUUID, IsInt } from 'class-validator';

import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => Array.isArray(value) ? value[0] : value)
  username?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => Array.isArray(value) ? value[0] : value)
  phone?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => Number(Array.isArray(value) ? value[0] : value))
  team_id?: number;
}

