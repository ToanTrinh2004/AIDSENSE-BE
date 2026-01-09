import { Module, Res } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { SupabaseModule } from 'src/supabase.module';
import { RedisProvider } from 'src/RedisService';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService,RedisProvider],
})
export class ChatbotModule {}
