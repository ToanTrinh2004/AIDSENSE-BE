import { IsOptional, IsInt, Min, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from 'src/firebase/NotificationPayloadDto';

export class QueryNotificationDto {
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

  @ApiPropertyOptional({
    example: false,
    description: 'Chỉ lấy thông báo chưa đọc',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unread_only?: boolean;

  @ApiPropertyOptional({
    enum: NotificationType,
    example: NotificationType.ANNOUNCEMENT,
    description: 'Chỉ lấy thông báo theo loại',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    enum: NotificationType,
    example: NotificationType.ANNOUNCEMENT,
    description: 'Loại thông báo cần loại bỏ',
  })
  @IsOptional()
  @IsEnum(NotificationType)
  exclude_type?: NotificationType;
}