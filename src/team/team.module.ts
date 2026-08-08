import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ChatbotModule } from 'src/chatbot/chatbot.module';

@Module({
  imports: [ChatbotModule], 
  controllers: [TeamController],
  providers: [TeamService, CloudinaryService],
})
export class TeamModule {}