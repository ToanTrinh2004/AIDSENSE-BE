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
import { SosService } from './sos.service';
import { CreateSosDto } from './dto/create-so.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('sos')
export class SosController {
  constructor(private readonly sosService: SosService) {}

  // SOS requests are critical — allow 5 per 10 s per user (generous but not abusable)
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

  // Public read — skip rate limit (cheap query, no abuse surface)
  @SkipThrottle()
  @HttpCode(200)
  @Get('events/aidsense')
  async findAllSosRequests() {
    return this.sosService.findAllSosRequests();
  }

  // No-auth SOS — stricter: 3 per 10 s
  @Throttle({ short: { limit: 3, ttl: 10000 }, medium: { limit: 15, ttl: 60000 } })
  @Post('request-no-auth')
  @UseInterceptors(FileInterceptor('image'))
  async requestSosWithOutAuth(
    @Body() createSosDto: CreateSosDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.sosService.sosRequestWithoutUser(createSosDto, file);
  }

  @Post('convert')
  async convertPlace(
    @Body('lat') lat: number,
    @Body('lon') lon: number,
  ) {
    const locationName = await this.sosService.convertPlace(lat, lon);
    return { location_name: locationName };
  }
}
