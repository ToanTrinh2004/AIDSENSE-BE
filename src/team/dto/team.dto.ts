import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Đội cứu hộ Bình Thạnh', description: 'Tên đội' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh', description: 'Tỉnh/Thành phố' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Bình Thạnh', description: 'Quận/Huyện' })
  @IsString()
  district: string;

  @ApiProperty({ example: 'Phường 25', description: 'Phường/Xã' })
  @IsString()
  commune: string;

  @ApiProperty({ example: 'MEDIUM', description: 'Quy mô đội', enum: ['SMALL', 'MEDIUM', 'LARGE'] })
  @IsIn(['SMALL', 'MEDIUM', 'LARGE'])
  size_member: string;

  @ApiPropertyOptional({ example: 'Tổ chức tình nguyện ABC', description: 'Tổ chức trực thuộc' })
  @IsOptional()
  @IsString()
  organizational?: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A', description: 'Tên trưởng nhóm' })
  @IsOptional()
  @IsString()
  leader?: string;

  @ApiPropertyOptional({ example: '0912345678', description: 'Số điện thoại liên hệ' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Trưởng nhóm', description: 'Chức vụ' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File đính kèm (giấy tờ xác thực...)' })
  file?: any;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}