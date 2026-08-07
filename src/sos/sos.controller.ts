import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { SosService } from './sos.service';
import { CreateSosDto, ConvertPlaceDto } from './dto/sos.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('SOS')
@Controller('sos')
export class SosController {
  constructor(private readonly sosService: SosService) {}

  @ApiOperation({ summary: 'Gửi yêu cầu SOS (đã đăng nhập)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateSosDto) },
        {
          type: 'object',
          properties: {
            image: { type: 'string', format: 'binary', description: 'Ảnh đính kèm' },
          },
        },
      ],
    },
  })
  @ApiExtraModels(CreateSosDto)
  @ApiResponse({ status: 201, description: 'Tạo yêu cầu SOS thành công' })
  @ApiBearerAuth()
  @Throttle({ short: { limit: 5, ttl: 10000 }, medium: { limit: 30, ttl: 60000 } })
  @UseGuards(AuthGuard)
  @Post('request')
  @UseInterceptors(FileInterceptor('image'))
  async requestSos(
    @Body() createSosDto: CreateSosDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.sosService.requestSos(createSosDto, file, req.user);
  }

  @ApiOperation({ summary: 'Lấy danh sách toàn bộ yêu cầu SOS (public)' })
  @ApiResponse({ status: 200, description: 'Danh sách yêu cầu SOS' })
  @SkipThrottle()
  @HttpCode(200)
  @Get('events/aidsense')
  async findAllSosRequests() {
    return this.sosService.findAllSosRequests();
  }

  @ApiOperation({ summary: 'Gửi yêu cầu SOS (không cần đăng nhập)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateSosDto })
  @ApiResponse({ status: 201, description: 'Tạo yêu cầu SOS thành công' })
  @Throttle({ short: { limit: 3, ttl: 10000 }, medium: { limit: 10, ttl: 60000 } })
  @Post('request-no-auth')
  @UseInterceptors(FileInterceptor('image'))
  async requestSosWithOutAuth(
    @Body() createSosDto: CreateSosDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    const ip = req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown';
    return this.sosService.sosRequestWithoutUser(createSosDto, file, ip);
  }

  @ApiOperation({ summary: 'Chuyển toạ độ (lat/lon) thành tên địa điểm' })
  @ApiResponse({ status: 200, description: 'Tên địa điểm' })
  @SkipThrottle()
  @Post('convert')
  async convertPlace(@Body() body: ConvertPlaceDto) {
    const locationName = await this.sosService.convertPlace(body.lat, body.lon);
    return { location_name: locationName };
  }
}