import { IsString, IsOptional, IsIn, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  JOIN_REQUEST = 'join_request',
  SOS_REQUEST = 'sos_request',
  TEAM_REGISTRATION = 'team_registration',
  ANNOUNCEMENT = 'announcement',
}

export class NotificationPayloadDto {
  @ApiPropertyOptional({ enum: NotificationType, example: NotificationType.JOIN_REQUEST })
  @IsOptional()
  @IsIn(Object.values(NotificationType))
  type?: string;

  @ApiPropertyOptional({ example: 'created', description: 'Hành động cụ thể (created, accepted, rejected, ...)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'uuid-of-request', description: 'ID liên quan (join request, sos request, ...)' })
  @IsOptional()
  @IsString()
  request_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-team', description: 'ID đội liên quan' })
  @IsOptional()
  @IsString()
  team_id?: string;

  @ApiPropertyOptional({ example: '<b>Nội dung</b> chi tiết', description: 'Nội dung HTML hiển thị trong app' })
  @IsOptional()
  @IsString()
  html_content?: string;


  toRecord(): Record<string, string> {
    const record: Record<string, string> = {};
    if (this.type) record.type = this.type;
    if (this.action) record.action = this.action;
    if (this.request_id) record.request_id = this.request_id;
    if (this.team_id) record.team_id = this.team_id;
    if (this.html_content) record.html_content = this.html_content;
    return record;
  }
}

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Thông báo hệ thống', description: 'Tiêu đề thông báo' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Hệ thống sẽ bảo trì vào 22h hôm nay', description: 'Nội dung thông báo' })
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ example: { type: 'system_broadcast' }, description: 'Dữ liệu bổ sung (tùy chọn)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}