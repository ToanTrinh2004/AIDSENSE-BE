import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { EventsGateway } from 'src/events/event.gateway';
import { TeamGateway } from 'src/team/team.gateway';

@Module({
  controllers: [AdminController],
  providers: [AdminService,EventsGateway,TeamGateway],
  exports: [EventsGateway],
})
export class AdminModule {}
