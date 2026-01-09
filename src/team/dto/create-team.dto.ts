import { IsString, IsUUID, IsOptional, IsIn, IsPhoneNumber } from 'class-validator';
export class CreateTeamDto {

    @IsString()
  name: string;

  @IsString()
  province: string;

  @IsString()
  district: string;

  @IsString()
  commune: string;

  @IsIn(['SMALL', 'MEDIUM', 'LARGE'])
  size_member: string;

  @IsOptional()
  @IsString()
  organizational?: string;

  @IsOptional()
  @IsString()
  leader?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsString()
  position?: string;

  




}
