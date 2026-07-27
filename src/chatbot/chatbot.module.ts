import { Module, Res } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { SupabaseModule } from 'src/supabase.module';


@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}
