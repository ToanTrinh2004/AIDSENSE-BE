import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ChatGateway } from 'src/chatbot/chat.gateway';


@Module({
  controllers: [TeamController],
  providers: [TeamService,CloudinaryService,ChatGateway],
})
export class TeamModule {}
