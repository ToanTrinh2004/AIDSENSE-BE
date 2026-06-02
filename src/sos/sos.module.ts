import { Module } from '@nestjs/common';
import { SosService } from './sos.service';
import { SosController } from './sos.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ClaudeNlpService } from './claude-nlp.service';
import { RedisProvider } from 'src/RedisService';

@Module({
  controllers: [SosController],
  providers: [SosService, CloudinaryService, ClaudeNlpService,RedisProvider],
})
export class SosModule {}
