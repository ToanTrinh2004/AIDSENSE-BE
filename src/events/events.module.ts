import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService,CloudinaryService],
})
export class EventsModule {}
