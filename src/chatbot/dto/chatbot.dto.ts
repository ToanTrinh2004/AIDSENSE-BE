import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({ example: 'Làm sao để đăng ký tài khoản?', description: 'Nội dung tin nhắn gửi cho chatbot' })
  @IsNotEmpty({ message: 'Message không được để trống' })
  @IsString()
  message: string;
}

export class InsertDocDto {
  @ApiProperty({ example: 'Nội dung tài liệu cần thêm vào RAG...', description: 'Nội dung tài liệu' })
  @IsNotEmpty({ message: 'Content không được để trống' })
  @IsString()
  content: string;
}

export class SendMessageDto {
  @ApiProperty({ example: 'uuid-of-sos' })
  @IsUUID()
  sos_id: string;

  @ApiProperty({ example: 'Tôi đang tới, khoảng 10 phút nữa' })
  @IsNotEmpty()
  @IsString()
  content: string;
}
export class QueryChatHistoryDto {
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
}