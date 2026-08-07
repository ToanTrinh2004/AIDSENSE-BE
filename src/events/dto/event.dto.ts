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
  IsInt,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum SosType {
  HELP = 'HELP',
  ESSENTIAL = 'ESSENTIAL',
  FOOD = 'FOOD',
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
    enum: ['HELP', 'ESSENTIAL', 'FOOD', 'OTHER'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(['HELP', 'ESSENTIAL', 'FOOD', 'OTHER'], { each: true })
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

export class UpdateEventDto extends PartialType(EventDto) { }

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



export class QuerySosDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'PENDING', description: 'Lọc theo trạng thái SOS' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'HELP', description: 'Lọc theo loại SOS' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'uuid-of-user', description: 'Lọc theo người tạo SOS' })
  @IsOptional()
  @IsUUID()
  userid?: string;

  @ApiPropertyOptional({ example: 'uuid-of-team', description: 'Lọc theo đội đang phụ trách' })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ example: '24h', enum: ['12h', '24h', '48h'], description: 'Lọc theo khoảng thời gian gần đây' })
  @IsOptional()
  @IsIn(['12h', '24h', '48h'])
  time_window?: string;

  @ApiPropertyOptional({ example: true, description: 'Lọc SOS đã được AI chỉnh sửa mô tả' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_ai_edited?: boolean;

  @ApiPropertyOptional({ example: 'ngập nước', description: 'Tìm kiếm theo mô tả hoặc địa chỉ' })
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh', description: 'Lọc theo tỉnh/thành phố' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 10.762622, description: 'Vĩ độ tâm điểm để lọc theo bán kính' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  center_lat?: number;

  @ApiPropertyOptional({ example: 106.660172, description: 'Kinh độ tâm điểm để lọc theo bán kính' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  center_lon?: number;

  @ApiPropertyOptional({ example: 100000, default: 100000, description: 'Bán kính lọc (mét)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius_meters?: number = 100000;
}


export class ViewportQueryDto {
  @ApiProperty({ example: 10.85, description: 'Vĩ độ phía Bắc viewport' })
  @Type(() => Number)
  @IsNumber()
  north: number;

  @ApiProperty({ example: 10.70, description: 'Vĩ độ phía Nam viewport' })
  @Type(() => Number)
  @IsNumber()
  south: number;

  @ApiProperty({ example: 106.75, description: 'Kinh độ phía Đông viewport' })
  @Type(() => Number)
  @IsNumber()
  east: number;

  @ApiProperty({ example: 106.60, description: 'Kinh độ phía Tây viewport' })
  @Type(() => Number)
  @IsNumber()
  west: number;

  @ApiProperty({ example: 13, description: 'Mức zoom hiện tại của bản đồ' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(21)
  zoom: number;

  @ApiPropertyOptional({ example: 'PENDING', description: 'Lọc theo trạng thái SOS' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '24h', enum: ['12h', '24h', '48h'], description: 'Lọc theo khoảng thời gian gần đây' })
  @IsOptional()
  @IsIn(['12h', '24h', '48h'])
  time_window?: string;
}