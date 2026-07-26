// events.dto.ts
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  IsIn,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum SosType {
  HELP = 'HELP',
  ESSENTIAL = 'ESSENTIAL',
  TOWING = 'TOWING',
  OTHER = 'OTHER',
  RESCUE = 'RESCUE',
  MEDICAL = 'MEDICAL',
}

export class EventDto {
  @ApiPropertyOptional({ example: false, description: 'Lấy sự kiện từ tất cả nguồn' })
  @IsOptional()
  @IsBoolean()
  all_sources?: boolean;

  @ApiPropertyOptional({ example: 'Ho Chi Minh City', description: 'Thành phố' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: ['HELP', 'ESSENTIAL'],
    description: 'Danh sách mã loại sự kiện',
    enum: ['HELP', 'ESSENTIAL', 'TOWING', 'OTHER'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(['HELP', 'ESSENTIAL', 'TOWING', 'OTHER'], { each: true })
  codes?: string[];

  @ApiPropertyOptional({ example: 'group-1', description: 'Nhóm sự kiện' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({ example: 10.762622, description: 'Vĩ độ' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 106.660172, description: 'Kinh độ' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lon?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Bán kính tìm kiếm (mét)' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  radius_meters?: number;

  @ApiPropertyOptional({ example: '24h', description: 'Khoảng thời gian, ví dụ: "24h"' })
  @IsOptional()
  @IsString()
  time_window?: string;
}

export class UpdateEventDto extends PartialType(EventDto) {}

export class ScoreDto {
  @ApiProperty({ example: 3.5, description: 'Khoảng cách (km)', minimum: 0 })
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @ApiProperty({ example: 4, description: 'Số lượng thành viên đội', minimum: 1 })
  @IsNumber()
  @Min(1)
  teamSize: number;

  @ApiProperty({ example: SosType.HELP, enum: SosType, description: 'Loại sự kiện khẩn cấp' })
  @IsEnum(SosType)
  emergencyType: SosType;

  @ApiProperty({ example: 15, description: 'Thời gian từ lúc được giao (phút)', minimum: 0, maximum: 2880 })
  @IsNumber()
  @Min(0)
  @Max(2880)
  timeFromAssignedMinutes: number;

  @ApiProperty({ example: 0.85, description: 'Điểm số từ LLM', minimum: 0 })
  @IsNumber()
  @Min(0)
  llm_score: number;
}