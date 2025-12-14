import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventsService } from './events.service';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventDto } from './dto/event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("aidsense")
  async findEvents(@Body() dto: EventDto) {
    return this.eventsService.findEvents(dto);
  }
}
