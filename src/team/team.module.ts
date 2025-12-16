import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { RedisProvider } from 'src/RedisService';

@Module({
  controllers: [TeamController],
  providers: [TeamService,CloudinaryService,RedisProvider],
})
export class TeamModule {}
