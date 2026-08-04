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
  Patch,
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
import { CreateTeamDto, KickMemberDto, QueryJoinRequestsDto, QueryTeamDto, QueryTeamMembersDto, RequestJoinTeamDto, RespondJoinRequestDto, UpdateTeamInfoDto } from './dto/team.dto';
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
  @UseInterceptors(FileInterceptor('document'))
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.teamService.createTeam(createTeamDto, file, req.user);
  }

  @ApiOperation({ summary: 'Xem chi tiết đội cứu hộ (chỉ đội đã duyệt)' })
  @ApiParam({ name: 'teamId', description: 'ID đội cứu hộ' })
  @ApiResponse({ status: 200, description: 'Chi tiết đội cứu hộ' })
  @HttpCode(200)
  @Get('/detail/:teamId')
  async getTeamDetail(@Param('teamId') teamId: string) {
    return this.teamService.getTeamDetail(teamId);
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

  @ApiOperation({ summary: 'Xem thông tin đội của mình (leader hoặc thành viên)' })
  @ApiResponse({ status: 200, description: 'Thông tin đội' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('my-team')
  async getMyTeam(@Req() req) {
    return this.teamService.getMyTeamInfo(req.user);
  }

  @ApiOperation({ summary: 'Chỉnh sửa thông tin đội của mình (leader)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Patch('my-team')
  async updateMyTeam(@Req() req, @Body() dto: UpdateTeamInfoDto) {
    return this.teamService.updateMyTeam(req.user, dto);
  }

  @ApiOperation({ summary: 'Xem danh sách thành viên trong đội (leader hoặc thành viên)' })
  @ApiResponse({ status: 200, description: 'Danh sách thành viên' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('members')
  async getTeamMembers(@Req() req, @Query() query: QueryTeamMembersDto) {
    return this.teamService.getTeamMembers(req.user, query);
  }

  @ApiOperation({ summary: 'Loại bỏ thành viên khỏi đội (leader)' })
  @ApiParam({ name: 'memberId', description: 'ID thành viên cần loại bỏ' })
  @ApiResponse({ status: 200, description: 'Loại bỏ thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('members/:memberId/kick')
  async kickMember(@Param('memberId') memberId: string, @Body() dto: KickMemberDto, @Req() req) {
    return this.teamService.kickMember(memberId, req.user, dto);
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

  @ApiOperation({ summary: 'Xem danh sách đội cứu hộ đã được duyệt (lọc, tìm kiếm, phân trang)' })
  @ApiResponse({ status: 200, description: 'Danh sách đội cứu hộ đã được duyệt' })
  @HttpCode(200)
  @Get()
  async findAllTeams(@Query() query: QueryTeamDto) {
    return this.teamService.findAllTeams(query);
  }

  @ApiOperation({ summary: 'Gửi yêu cầu tham gia đội' })
  @ApiResponse({ status: 200, description: 'Gửi yêu cầu thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('join-request')
  async requestToJoinTeam(@Body() dto: RequestJoinTeamDto, @Req() req) {
    return this.teamService.requestToJoinTeam(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Xem danh sách yêu cầu tham gia đội đang chờ duyệt' })
  @ApiResponse({ status: 200, description: 'Danh sách yêu cầu đang chờ' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('join-requests/pending')
  async getPendingJoinRequests(@Req() req, @Query() query: QueryJoinRequestsDto) {
    return this.teamService.getPendingJoinRequests(req.user, query);
  }

  @ApiOperation({ summary: 'Leader chấp nhận/từ chối yêu cầu tham gia đội' })
  @ApiParam({ name: 'requestId', description: 'ID yêu cầu tham gia' })
  @ApiResponse({ status: 200, description: 'Phản hồi yêu cầu thành công' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('join-request/:requestId/respond')
  async respondToJoinRequest(
    @Param('requestId') requestId: string,
    @Body() dto: RespondJoinRequestDto,
    @Req() req,
  ) {
    return this.teamService.respondToJoinRequest(requestId, req.user, dto);
  }

  @ApiOperation({ summary: 'Xem yêu cầu tham gia đội hiện tại' })
  @ApiResponse({ status: 200, description: 'Thông tin yêu cầu tham gia đội hiện tại' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('join-request/current')
  async getCurrentJoinRequest(@Req() req) {
    return this.teamService.getCurrentJoinRequest(req.user.id);
  }
}