import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseGuards, UseInterceptors, UploadedFile, Req, Query } from '@nestjs/common';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('register/informations')
  @UseInterceptors(FileInterceptor('file'))
  async create(@Body() createTeamDto: CreateTeamDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req) {
    return this.teamService.createTeam(createTeamDto,file,req.user);
  }
// nhan support request
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('support/:sosId')
  async support(@Param('sosId') sosId: string,
    @Req() req) {
    return this.teamService.supporting(sosId, req.user);
  }
// huy support request
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('unsupport/:sosId')
  async unsupport(@Param('sosId') sosId: string,
    @Req() req) {
    return this.teamService.unsupport(sosId, req.user);
  }
// danh dau sos da duoc team ho tro
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('supported/:sosId')
  async getSupportedSos(@Param('sosId') sosId: string,
  @Req() req) {
    return this.teamService.supported(sosId,req.user);
  }
  // xem thong tin team cua minh
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('my-team')
  async getMyTeam(@Req() req) {
    return this.teamService.teamsInfo(req.user);
  }

// xem tat ca cac request sos ma team minh da va dang ho tro
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('all-support')
  async getAllTeams(@Req() req,@Query('status') status: string) {
    return this.teamService.getSosByTeam(req.user,status);
  }
  
}
