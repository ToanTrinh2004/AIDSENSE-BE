import { IsOptional, IsString, IsDateString, IsUUID, IsInt } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsDateString()
  dob?: string; // yyyy-mm-dd

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  team_id?: number;
}
