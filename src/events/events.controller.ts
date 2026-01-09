import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { EventsService } from './events.service';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventDto } from './dto/event.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("aidsense")
  async findEvents(@Body() dto: EventDto, @Req() req) {
    return this.eventsService.findEvents(dto,req.user ?? null);
  }
}
