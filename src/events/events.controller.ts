import { Controller, Post, Body, Req, Get, HttpCode, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { EventDto, QuerySosDto, ViewportQueryDto } from './dto/event.dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) { }
  @ApiOperation({ summary: 'Danh sách SOS (phân trang, filter status/type/user/team/time/search)' })
  @HttpCode(200)
  @Get()
  async getSosList(@Query() query: QuerySosDto) {
    return this.eventsService.getSosList(query);
  }

  @SkipThrottle()
  @ApiOperation({ summary: 'Lấy SOS theo viewport (cluster hoặc marker tùy mật độ/zoom)' })
  @ApiResponse({ status: 200, description: 'Danh sách cluster hoặc marker' })
  @HttpCode(200)
  @Get('viewport')
  async getSosForViewport(@Query() query: ViewportQueryDto) {
    return this.eventsService.getSosForViewport(query);
  }
}