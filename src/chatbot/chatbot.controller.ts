import { Controller, Post, Body, UseGuards, Get, Param, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto, InsertDocDto, QueryChatHistoryDto } from './dto/chatbot.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@ApiTags('Chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @ApiOperation({ summary: 'Gửi tin nhắn tới chatbot' })
  @ApiResponse({ status: 200, description: 'Trả lời từ chatbot' })
  @Post('chat')
  async chatWithBot(@Body() body: ChatMessageDto) {
    return this.chatbotService.chatWithBot(body.message);
  }

  @ApiOperation({ summary: 'Thêm tài liệu vào knowledge base (RAG)' })
  @ApiResponse({ status: 200, description: 'Thêm tài liệu thành công' })
  @Post('insert-docs')
  async insertDocs(@Body() body: InsertDocDto) {
    return this.chatbotService.insertDocument(body.content);
  }

  @UseGuards(AuthGuard)
  @Get(':sosId/history')
  async getChatHistory(
    @Param('sosId') sosId: string,
    @Query() query: QueryChatHistoryDto,
    @Req() req,
  ) {
    return this.chatbotService.getChatHistory(sosId, req.user, query.page, query.limit);
  }}