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
  @IsPhoneNumber('VN')
  phone?: string;

  @IsOptional()
  @IsString()
  position?: string;

  // default PENDING → không để client gửi lên
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  team_status?: string;



  // leader phải là user trong bảng users
  @IsUUID()
  leader_id: string;
}
