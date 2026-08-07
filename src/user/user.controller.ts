import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { QueryMySosDto, UpdateFcmTokenDto, UpdateProfileDto } from './dto/user.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';


@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @ApiOperation({ summary: 'Xem thông tin cá nhân' })
  @ApiResponse({ status: 200, description: 'Thông tin profile' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('profile')
  async viewMyProfile(@Req() req) {
    return this.userService.viewMyProfile(req.user);
  }

  @ApiOperation({ summary: 'Xem tất cả yêu cầu SOS của mình' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách SOS của bản thân',
  })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('profile/sos')
  async viewMySosRequests(
    @Req() req,
    @Query() query: QueryMySosDto,
  ) {
    return this.userService.viewMySosRequests(req.user, query);
  }

  @ApiOperation({ summary: 'Hủy yêu cầu SOS của mình' })
  @ApiParam({ name: 'sosId', description: 'ID yêu cầu SOS' })
  @ApiResponse({ status: 200, description: 'Hủy thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('profile/sos/cancel/:sosId')
  async cancelSosRequest(@Param('sosId') sosId: string, @Req() req) {
    return this.userService.cancelSosRequest(sosId, req.user);
  }

  @ApiOperation({ summary: 'Hoàn thành yêu cầu SOS của mình' })
  @ApiParam({ name: 'sosId', description: 'ID yêu cầu SOS' })
  @ApiResponse({ status: 200, description: 'Hoàn thành thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('profile/sos/complete/:sosId')
  async completeSosRequest(@Param('sosId') sosId: string, @Req() req) {
    return this.userService.completeSosRequest(sosId, req.user);
  }

  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Patch('profile')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateProfile(
    @Req() req,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.userService.updateProfile(req.user, updateProfileDto, avatar);
  }


  @ApiOperation({ summary: 'Tìm người dùng cùng tỉnh/thành phố' })
  @ApiResponse({ status: 200, description: 'Danh sách người dùng cùng tỉnh' })
  @Get('profile/same-province')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async findUsersBySameProvince(@Req() req) {
    return this.userService.findUsersBySameProvince(req.user);
  }
  @ApiOperation({ summary: 'Cập nhật FCM token' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Patch('fcm-token')
  async updateFcmToken(@Req() req, @Body() dto: UpdateFcmTokenDto) {
    return this.userService.updateFcmToken(req.user, dto.fcm_token, dto.platform);
  }
}