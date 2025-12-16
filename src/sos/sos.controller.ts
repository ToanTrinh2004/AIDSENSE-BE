import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseGuards, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { SosService } from './sos.service';
import { CreateSosDto } from './dto/create-so.dto';
import { UpdateSosDto } from './dto/update-so.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('sos')
export class SosController {
  constructor(private readonly sosService: SosService) { }

  @UseGuards(AuthGuard)
  @Post('request')
  @UseInterceptors(FileInterceptor('image'))
async requestSos(
  @Body() createSosDto: CreateSosDto,
  @UploadedFile() file: Express.Multer.File,
  @Req() req
) {
  return this.sosService.requestSos(createSosDto, file, req.user);
}
@HttpCode(200)
@Get('events/aidsense')
async findAllSosRequests() {
  return this.sosService.findAllSosRequests();

}
@Post('request-no-auth')
@UseInterceptors(FileInterceptor('image'))
async requestSosWithOutAuth(
@Body() createSosDto: CreateSosDto,
@UploadedFile() file: Express.Multer.File,
) {
return this.sosService.sosRequestWithoutUser(createSosDto, file);
}




}
