import { Module } from '@nestjs/common';
import { SosService } from './sos.service';
import { SosController } from './sos.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ClaudeNlpService } from './claude-nlp.service';

@Module({
  controllers: [SosController],
  providers: [SosService, CloudinaryService, ClaudeNlpService],
})
export class SosModule {}
