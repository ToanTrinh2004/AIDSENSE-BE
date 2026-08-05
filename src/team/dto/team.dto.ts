
import { IsString, IsOptional, IsIn, IsNotEmpty, IsEmail, Matches, IsInt, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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
export class QueryTeamDto {
  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh', description: 'Lọc theo tỉnh/thành phố' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 'Đội cứu hộ', description: 'Tìm theo tên đội (gần đúng)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '10', description: 'Lọc theo số lượng thành viên' })
  @IsOptional()
  @IsString()
  size_member?: string;

  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Số lượng mỗi trang', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
export class UpdateTeamDto extends PartialType(CreateTeamDto) {}


export class RequestJoinTeamDto {
  @ApiProperty({ example: 'uuid-of-team', description: 'ID đội muốn tham gia' })
  @IsNotEmpty({ message: 'Team ID không được để trống' })
  @IsUUID()
  team_id: string;

  @ApiPropertyOptional({
    example: 'Hi mình là ..., mình muốn tham gia đội cứu hộ của bạn...',
    description: 'Lời nhắn gửi cho leader',
  })
  @IsOptional()
  @IsString()
  request_message?: string;
}

export class RespondJoinRequestDto {
  @ApiProperty({ example: 'ACCEPTED', enum: ['ACCEPTED', 'REJECTED'], description: 'Phản hồi yêu cầu' })
  @IsIn(['ACCEPTED', 'REJECTED'], { message: 'Trạng thái không hợp lệ' })
  status: 'ACCEPTED' | 'REJECTED';

  @ApiPropertyOptional({
    example: 'Chào mừng bạn gia nhập đội!',
    description: 'Lời nhắn phản hồi của leader',
  })
  @IsOptional()
  @IsString()
  response_message?: string;
}
export class QueryJoinRequestsDto {
  @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Số lượng mỗi trang', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
export class QueryTeamMembersDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class KickMemberDto {
  @ApiProperty({ example: 'Vi phạm nội quy đội', description: 'Lý do loại bỏ thành viên' })
  @IsNotEmpty({ message: 'Lý do không được để trống' })
  @IsString()
  reason_kicked: string;
}
export class GetUserInfoQueryDto {
  @ApiPropertyOptional({ example: 'uuid-of-user', description: 'ID người dùng muốn xem (bỏ trống để xem thông tin của chính mình)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
export class UpdateTeamInfoDto extends PartialType(CreateTeamDto) {}