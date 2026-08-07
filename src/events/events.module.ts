import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EventsGateway } from './event.gateway';

@Module({
  controllers: [EventsController],
  providers: [EventsService,EventsGateway],
  exports: [ EventsGateway],
})
export class EventsModule {}
