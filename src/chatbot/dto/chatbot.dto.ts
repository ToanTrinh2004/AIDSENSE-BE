import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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