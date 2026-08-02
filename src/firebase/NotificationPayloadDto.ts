import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  JOIN_REQUEST = 'join_request',
  SOS_REQUEST = 'sos_request',
  TEAM_REGISTRATION = 'team_registration',
  ANNOUNCEMENT = 'announcement',
}

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Thông báo hệ thống', description: 'Tiêu đề thông báo' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Hệ thống sẽ bảo trì vào 22h hôm nay', description: 'Nội dung thông báo (có thể chứa HTML)' })
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'https://example.com/banner.jpg', description: 'Ảnh minh họa (tùy chọn)' })
  @IsOptional()
  @IsString()
  image_url?: string;
}