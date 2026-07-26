import { IsOptional, IsString, IsDateString, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A', description: 'Tên người dùng' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (Array.isArray(value) ? value[0] : value))
  username?: string;

  @ApiPropertyOptional({ example: '0912345678', description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (Array.isArray(value) ? value[0] : value))
  phone?: string;

  @ApiPropertyOptional({ example: '1999-05-20', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ example: '123 Nguyen Trai, Q5, TPHCM', description: 'Địa chỉ' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 4, description: 'ID đội tham gia' })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => Number(Array.isArray(value) ? value[0] : value))
  team_id?: number;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Ảnh đại diện' })
  avatar?: any;
}