import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { CreateChatbotDto } from './dto/create-chatbot.dto';
import { UpdateChatbotDto } from './dto/update-chatbot.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('chat')
  async chatWithBot(@Body('message') message: string) {
    return this.chatbotService.chatWithBot(message);
  }
  @Post('insert-docs')
  async insertDocs(@Body('content') content: string) {  
    return this.chatbotService.insertDocument( content);
  }
}
