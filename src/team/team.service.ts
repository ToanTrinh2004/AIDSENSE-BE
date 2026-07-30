import { Inject, Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { CreateTeamDto, QueryTeamDto, RequestJoinTeamDto, RespondJoinRequestDto } from './dto/team.dto';
import { UpdateTeamDto } from './dto/team.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import Redis from 'ioredis';
import { Messages } from 'src/utils/messages';
import { FirebaseService } from 'src/firebase/FirebaseService';

@Injectable()
export class TeamService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly cloudinaryService: CloudinaryService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly firebaseService: FirebaseService,
  ) { }

  async createTeam(
    createTeamDto: CreateTeamDto,
    file: Express.Multer.File,
    user: any
  ) {
    const documentsUrl = file
      ? await this.cloudinaryService.uploadDocument(file)
      : null;

    const userId = user.id;

    try {

      const { data: existingTeam, error: checkError } = await this.supabase
        .from('team_rescue')
        .select('id, team_status')
        .eq('leader_id', userId)
        .eq('team_status', 'PENDING')
        .maybeSingle();

      if (checkError) {
        throw new HttpException(
          checkError.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (existingTeam) {
        throw new HttpException(
          'Bạn đã đăng ký đội cứu hộ và đang chờ Admin xét duyệt.',
          HttpStatus.CONFLICT,
        );
      }


      const { data: teamData, error: teamError } = await this.supabase
        .from('team_rescue')
        .insert([{
          ...createTeamDto,
          document_url: documentsUrl,
          leader_id: userId,
          team_status: 'PENDING',
        }])
        .select()
        .single();

      if (teamError) {
        throw new HttpException(
          teamError.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      const { error: userUpdateError } = await this.supabase
        .from('users')
        .update({
          roles: 'LEADER',
          team_id: teamData.id,
        })
        .eq('id', userId);

      if (userUpdateError) {
        throw new HttpException(
          `Không thể cập nhật vai trò người dùng: ${userUpdateError.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        message: 'Thành công tạo đội cứu trợ, vui lòng chờ Admin xét duyệt.',
        data: teamData,
      };
    } catch (error) {
      console.error('Error in createTeam:', error);
      throw error;
    }
  }



  async supporting(sosId: string, user: any) {
    const teamId = await this.validateApprovedTeam(user);
    await this.validateSosStatus(sosId, 'PENDING');

    const { data } = await this.supabase
      .from('sos_request')
      .update({ status: 'IN_PROGRESS', teamId: teamId })
      .eq('id', sosId)
      .select()
      .single();

    if (!data) {
      throw new HttpException('Không thuộc đội cứu trợ', HttpStatus.BAD_REQUEST);
    }

    return {
      message: 'Cứu trợ được chấp nhận',
      data,
    };
  }

  async unsupport(sosId: string, user: any) {
    const teamId = await this.validateApprovedTeam(user);
    await this.validateSosStatus(sosId, 'IN_PROGRESS');

    const { data } = await this.supabase
      .from('sos_request')
      .update({ status: 'PENDING', teamId: null })
      .eq('id', sosId)
      .select()
      .single();

    if (!data) {
      throw new HttpException('Không thuộc đội cứu trợ', HttpStatus.BAD_REQUEST);
    }

    return {
      message: 'Hỗ trợ bị hủy bỏ',
      data,
    };
  }

  async supported(sosId: string, user: any) {
    const teamId = await this.validateApprovedTeam(user);
    await this.validateSosStatus(sosId, 'IN_PROGRESS');

    const { data } = await this.supabase
      .from('sos_request')
      .update({ status: 'COMPLETE' })
      .eq('id', sosId)
      .select()
      .single();

    if (!data) {
      throw new HttpException('Không thuộc đội cứu trợ', HttpStatus.BAD_REQUEST);
    }

    return {
      message: 'Hỗ trợ hoàn thành',
      data,
    };
  }

  private async validateApprovedTeam(user: any) {
    const leaderId = user.id;
    console.log('Validating team for leaderId:', leaderId);


    const { data, error } = await this.supabase
      .from('team_rescue')
      .select('id, team_status')
      .eq('leader_id', leaderId)
      .single();


    if (error || !data || data.team_status !== 'APPROVED') {
      throw new HttpException('Team không tồn tại hoặc chưa được phê duyệt', HttpStatus.BAD_REQUEST);
    }

    return data.id; // teamId
  }

  private async validateSosStatus(sosId: string, expectedStatus: string) {
    const { data, error } = await this.supabase
      .from('sos_request')
      .select('*')
      .eq('id', sosId)
      .eq('status', expectedStatus)
      .single();

    if (error || !data) {
      throw new HttpException(
        `Không tìm thấy yêu cầu SOS hoặc không ở trạng thái: ${expectedStatus}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return data;
  }

  async teamsInfo(user: any) {
    const teamId = user.id;
    const { data, error } = await this.supabase
      .from('team_rescue')
      .select('*')
      .eq('leader_id', teamId)
      .single();

    if (error || !data) {
      throw new HttpException('Không tìm thấy đội cứu trợ', HttpStatus.BAD_REQUEST);
    }

    return data;
  }

  async getSosByTeam(user: any, status?: string) {
    const teamId = await this.validateApprovedTeam(user);

    const { data, error } = await this.supabase
      .from('sos_request')
      .select('*')
      .eq('teamId', teamId)
      .eq(status ? 'status' : '', status ? status : '');

    if (error) {
      throw new HttpException('Không tìm thấy đội cứu trợ', HttpStatus.BAD_REQUEST);
    }


    return {
      message: 'Lấy danh sách SOS thành công',
      data,
    };
  }

  async findAllTeams(query: QueryTeamDto) {
    const { province, name, size_member, page = 1, limit = 10 } = query;

    let request = this.supabase
      .from('team_rescue')
      .select('*', { count: 'exact' })
      .eq('team_status', 'APPROVED'); // only admin-verified teams are publicly visible

    if (province) {
      request = request.eq('province', province);
    }
    if (name) {
      request = request.ilike('name', `%${name}%`);
    }
    if (size_member) {
      request = request.eq('size_member', size_member);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await request
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      data,
      pagination: {
        total: count ?? 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    };



  }

  async requestToJoinTeam(userId: string, dto: RequestJoinTeamDto) {
    const { team_id, request_message } = dto;

    const { data: currentUser, error: userError } = await this.supabase
      .from('users')
      .select('team_id, username')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new BadRequestException(Messages.cannotCheckUser);
    }
    if (currentUser?.team_id) {
      throw new BadRequestException(Messages.alreadyInTeam);
    }

    const { data: team, error: teamError } = await this.supabase
      .from('team_rescue')
      .select('id, name, leader_id')
      .eq('id', team_id)
      .single();

    if (teamError || !team) {
      throw new BadRequestException(Messages.teamNotFound);
    }

    const { data: existingRequest } = await this.supabase
      .from('team_join_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', team_id)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingRequest) {
      throw new BadRequestException(Messages.joinRequestAlreadyPending);
    }

    const { data, error } = await this.supabase
      .from('team_join_requests')
      .insert([{ user_id: userId, team_id, status: 'PENDING', request_message }])
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Notify the leader of the new join request
    const { data: leader } = await this.supabase
      .from('users')
      .select('fcm_token')
      .eq('id', team.leader_id)
      .single();

    await this.firebaseService.sendPushToUser(
      team.leader_id,
      'Yêu cầu tham gia đội mới',
      `${currentUser.username || 'Một người dùng'} muốn tham gia đội ${team.name}`,
    );

    return { success: true, message: Messages.joinRequestSent, data };
  }

  async getPendingJoinRequests(leaderUser: any) {
    const leaderId = leaderUser.id;

    const { data: team, error: teamError } = await this.supabase
      .from('team_rescue')
      .select('id')
      .eq('leader_id', leaderId)
      .single();

    if (teamError || !team) {
      throw new BadRequestException(Messages.teamNotFound);
    }

    const { data, error } = await this.supabase
      .from('team_join_requests')
      .select(`
        id, request_message, status, created_at,
        users:user_id (
          id, username, phone, avatar
        )
      `)
      .eq('team_id', team.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async respondToJoinRequest(requestId: string, leaderUser: any, dto: RespondJoinRequestDto) {
    const leaderId = leaderUser.id;
    const { status, response_message } = dto;

    const { data: joinRequest, error: requestError } = await this.supabase
      .from('team_join_requests')
      .select('*, team_rescue!inner(id, leader_id, name)')
      .eq('id', requestId)
      .single();

    if (requestError || !joinRequest) {
      throw new BadRequestException(Messages.joinRequestNotFound);
    }

    if (joinRequest.team_rescue.leader_id !== leaderId) {
      throw new BadRequestException(Messages.notTeamLeader);
    }

    if (joinRequest.status !== 'PENDING') {
      throw new BadRequestException(Messages.joinRequestAlreadyResponded);
    }

    const { error: updateError } = await this.supabase
      .from('team_join_requests')
      .update({
        status,
        response_message,
        responded_at: new Date().toISOString(),
        responded_by: leaderId,
      })
      .eq('id', requestId);

    if (updateError) {
      throw new BadRequestException(updateError.message);
    }

    if (status === 'ACCEPTED') {
      const { error: userUpdateError } = await this.supabase
        .from('users')
        .update({ roles: 'VOLUNTEER', team_id: joinRequest.team_id })
        .eq('id', joinRequest.user_id);

      if (userUpdateError) {
        throw new BadRequestException(userUpdateError.message);
      }
    }

    const { data: requestingUser } = await this.supabase
      .from('users')
      .select('fcm_token')
      .eq('id', joinRequest.user_id)
      .single();

    const title = status === 'ACCEPTED' ? 'Yêu cầu được chấp nhận' : 'Yêu cầu bị từ chối';
    const body = response_message || (status === 'ACCEPTED'
      ? `Bạn đã được chấp nhận vào đội ${joinRequest.team_rescue.name}`
      : `Yêu cầu tham gia đội ${joinRequest.team_rescue.name} đã bị từ chối`);

    await this.firebaseService.sendPushToUser(joinRequest.user_id, title, body);
    return {
      success: true,
      message: status === 'ACCEPTED' ? Messages.joinRequestAccepted : Messages.joinRequestRejected,
    };
  }

}
