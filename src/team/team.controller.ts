import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
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
  ApiQuery,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { TeamService } from './team.service';
import { CreateTeamDto } from './dto/team.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Team')
@ApiBearerAuth()
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) { }

  @ApiOperation({ summary: 'Đăng ký thông tin đội' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateTeamDto) },
        {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              format: 'binary',
              description: 'Ảnh giấy xác nhận',
            },
          },
        },
      ],
    },
  })
  @ApiExtraModels(CreateTeamDto)
  @ApiResponse({ status: 200, description: 'Tạo đội thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('register/informations')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.teamService.createTeam(createTeamDto, file, req.user);
  }

  @ApiOperation({ summary: 'Nhận yêu cầu hỗ trợ SOS' })
  @ApiParam({ name: 'sosId', description: 'ID yêu cầu SOS' })
  @ApiResponse({ status: 200, description: 'Nhận hỗ trợ thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('support/:sosId')
  async support(@Param('sosId') sosId: string, @Req() req) {
    return this.teamService.supporting(sosId, req.user);
  }

  @ApiOperation({ summary: 'Hủy hỗ trợ yêu cầu SOS' })
  @ApiParam({ name: 'sosId', description: 'ID yêu cầu SOS' })
  @ApiResponse({ status: 200, description: 'Hủy hỗ trợ thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('unsupport/:sosId')
  async unsupport(@Param('sosId') sosId: string, @Req() req) {
    return this.teamService.unsupport(sosId, req.user);
  }

  @ApiOperation({ summary: 'Đánh dấu SOS đã được team hỗ trợ' })
  @ApiParam({ name: 'sosId', description: 'ID yêu cầu SOS' })
  @ApiResponse({ status: 200, description: 'Đánh dấu thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('supported/:sosId')
  async getSupportedSos(@Param('sosId') sosId: string, @Req() req) {
    return this.teamService.supported(sosId, req.user);
  }

  @ApiOperation({ summary: 'Xem thông tin đội của mình' })
  @ApiResponse({ status: 200, description: 'Thông tin đội' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('my-team')
  async getMyTeam(@Req() req) {
    return this.teamService.teamsInfo(req.user);
  }

  @ApiOperation({ summary: 'Xem tất cả request SOS mà team đã/đang hỗ trợ' })
  @ApiQuery({ name: 'status', required: false, description: 'Lọc theo trạng thái' })
  @ApiResponse({ status: 200, description: 'Danh sách SOS đã hỗ trợ' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('all-support')
  async getAllTeams(@Req() req, @Query('status') status: string) {
    return this.teamService.getSosByTeam(req.user, status);
  }
}