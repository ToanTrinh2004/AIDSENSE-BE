import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { EventDto } from './dto/event.dto';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @ApiOperation({ summary: 'Tìm sự kiện SOS/AidSense theo vị trí, bán kính, loại...' })
  @ApiResponse({ status: 200, description: 'Danh sách sự kiện phù hợp' })
  @ApiBearerAuth()
  @Post('aidsense')
  async findEvents(@Body() dto: EventDto, @Req() req) {
    return this.eventsService.findEvents(dto, req.user ?? null);
  }
}