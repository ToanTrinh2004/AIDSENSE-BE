
import { IsString, IsOptional, IsIn, IsNotEmpty, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum TeamContactRole {
  LEADER = 'LEADER',           // Leader
  VOLUNTEER = 'VOLUNTEER',     // Tình nguyện viên
}

const PHONE_REGEX = /^(0[35789]\d{8})$/;
const PHONE_MESSAGE = 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam hợp lệ.';

export class CreateTeamDto {
  @ApiProperty({ example: 'Đội cứu hộ Bình Thạnh', description: 'Tên đội' })
  @IsNotEmpty({ message: 'Tên đội không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh', description: 'Tỉnh/Thành phố' })
  @IsNotEmpty({ message: 'Tỉnh/Thành phố không được để trống' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Phường 25', description: 'Xã/Phường' })
  @IsNotEmpty({ message: 'Xã/Phường không được để trống' })
  @IsString()
  commune: string;

  @ApiProperty({ example: '10', description: 'Số lượng thành viên' })
  @IsNotEmpty({ message: 'Số lượng thành viên không được để trống' })
  @IsString()
  size_member: string;

  @ApiPropertyOptional({ example: 'Tổ chức tình nguyện ABC', description: 'Đơn vị tổ chức' })
  @IsOptional()
  @IsString()
  organizational?: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Họ và tên người phụ trách' })
  @IsNotEmpty({ message: 'Họ và tên người phụ trách không được để trống' })
  @IsString()
  leader: string;

  @ApiProperty({ example: '0912345678', description: 'Số điện thoại liên hệ' })
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: 'team@example.com', description: 'Email liên hệ' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: TeamContactRole.LEADER, enum: TeamContactRole, description: 'Vai trò người đăng ký' })
  @IsIn([TeamContactRole.LEADER, TeamContactRole.VOLUNTEER], { message: 'Vai trò không hợp lệ' })
  position: TeamContactRole;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}