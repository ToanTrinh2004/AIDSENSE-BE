import { Module, Res } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { SupabaseModule } from 'src/supabase.module';
import { ChatGateway } from './chat.gateway';


@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService,ChatGateway],
  exports: [ChatGateway],
})
export class ChatbotModule {}
