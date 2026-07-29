import { IsOptional, IsString, IsDateString, IsInt, IsEmail, Matches, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A', description: 'Họ và tên' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (Array.isArray(value) ? value[0] : value))
  username?: string;

  @ApiPropertyOptional({ example: '0912345678', description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (Array.isArray(value) ? value[0] : value))
  phone?: string;

  @ApiPropertyOptional({ example: 'user@example.com', description: 'Email' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Transform(({ value }) => (Array.isArray(value) ? value[0] : value))
  email?: string;

  @ApiPropertyOptional({ example: '079203001234', description: 'Số CCCD (12 số)' })
  @IsOptional()
  @Matches(/^\d{9}(\d{3})?$/, { message: 'CCCD không hợp lệ (9 hoặc 12 số)' })
  @Transform(({ value }) => (Array.isArray(value) ? value[0] : value))
  cccd?: string;

  @ApiPropertyOptional({ example: '1999-05-20', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ example: '123 Nguyen Trai, Q5, TPHCM', description: 'Địa chỉ' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh', description: 'Tỉnh/Thành phố' })
  @IsOptional()
  province?: string;

}