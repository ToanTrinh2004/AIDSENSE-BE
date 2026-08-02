import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './dto/notification.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Danh sách thông báo của tôi' })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo' })
  @UseGuards(AuthGuard)
  @Get()
  async getNotifications(@Req() req, @Query() query: QueryNotificationDto) {
    return this.notificationService.getNotifications(req.user.id, query);
  }

  @ApiOperation({ summary: 'Chi tiết thông báo' })
  @ApiParam({ name: 'id', description: 'ID thông báo' })
  @ApiResponse({ status: 200, description: 'Chi tiết thông báo' })
  @UseGuards(AuthGuard)
  @Get(':id')
  async getNotificationDetail(@Param('id') id: string, @Req() req) {
    return this.notificationService.getNotificationDetail(id, req.user.id);
  }
}