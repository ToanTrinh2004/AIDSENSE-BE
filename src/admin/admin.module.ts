import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { EventsGateway } from 'src/events/event.gateway';

@Module({
  controllers: [AdminController],
  providers: [AdminService,EventsGateway],
  exports: [EventsGateway],
})
export class AdminModule {}
