import { Inject, Injectable, HttpException, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateTeamDto, KickMemberDto, QueryJoinRequestsDto, QueryTeamDto, QueryTeamMembersDto, RequestJoinTeamDto, RespondJoinRequestDto, UpdateTeamInfoDto } from './dto/team.dto';
import { UpdateTeamDto } from './dto/team.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import Redis from 'ioredis';
import { Messages } from 'src/utils/messages';
import { FirebaseService } from 'src/firebase/FirebaseService';
import { NotificationService } from 'src/notification/notification.service';
import { ChatGateway } from 'src/chatbot/chat.gateway';

@Injectable()
export class TeamService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly cloudinaryService: CloudinaryService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly firebaseService: FirebaseService,
    private readonly notificationService: NotificationService,
    private readonly chatGateway: ChatGateway
    
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

      const { error: memberInsertError } = await this.supabase
        .from('team_members')
        .insert([{ team_id: teamData.id, user_id: userId, status: 'ACTIVE' }]);

      if (memberInsertError) {
        throw new HttpException(
          `Không thể thêm leader vào danh sách thành viên: ${memberInsertError.message}`,
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
    const sos = await this.validateSosStatus(sosId, 'PENDING');
  
    const { data } = await this.supabase
      .from('sos_request')
      .update({ status: 'IN_PROGRESS', teamId: teamId })
      .eq('id', sosId)
      .select()
      .single();
  
    if (!data) {
      throw new HttpException('Không thuộc đội cứu trợ', HttpStatus.BAD_REQUEST);
    }
  
    // Thông báo cho user biết có team nhận hỗ trợ + mở chat room
    await this.notificationService.createAndSend({
      userId: sos.userid,
      title: 'Đã có đội cứu hộ nhận hỗ trợ',
      content: `Đội cứu hộ đã nhận yêu cầu của bạn và đang trên đường tới.`,
      type: 'sos_request',
      action: 'supported',
      requestId: sosId,
      data: { sos_id: sosId, team_id: teamId },
      extraPayload: { sos_id: sosId, team_id: teamId },
    });
  
    await this.chatGateway.notifyRoomReady(sosId, user.id, sos.userid);
  
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

    return data.id;
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

  async getTeamDetail(teamId: string) {
    const { data: team, error: teamError } = await this.supabase
      .from('team_rescue')
      .select('*')
      .eq('id', teamId)
      .eq('team_status', 'APPROVED')
      .single();

    if (teamError || !team) {
      throw new BadRequestException(Messages.teamNotFound);
    }

    const { data: members, error: membersError } = await this.supabase
      .from('users')
      .select('id, username, phone, avatar, roles')
      .eq('team_id', teamId);

    if (membersError) {
      throw new BadRequestException(membersError.message);
    }

    return {
      ...team,
      members: members ?? [],
      total_members: members?.length ?? 0,
    };
  }

  async updateMyTeam(user: any, dto: UpdateTeamInfoDto) {
    const leaderId = user.id;
  
    const { data: team, error: teamError } = await this.supabase
      .from('team_rescue')
      .select('id')
      .eq('leader_id', leaderId)
      .single();
  
    if (teamError || !team) {
      throw new BadRequestException(Messages.teamNotFound);
    }
  
    const { data, error } = await this.supabase
      .from('team_rescue')
      .update({ ...dto })
      .eq('id', team.id)
      .select()
      .single();
  
    if (error) {
      throw new BadRequestException(error.message);
    }
  
    return { success: true, message: Messages.teamUpdated, data };
  }
  async findAllTeams(query: QueryTeamDto) {
    const { province, name, size_member, page = 1, limit = 10 } = query;

    let request = this.supabase
      .from('team_rescue')
      .select('*', { count: 'exact' })
      .eq('team_status', 'APPROVED');

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
      .select('team_id, username, phone')
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

    const joinRequestPayload = {
      username: currentUser.username,
      phone: currentUser.phone,
      time: data.created_at,
      reason: request_message,
    };

    await this.notificationService.createAndSend({
      userId: team.leader_id,
      title: 'Yêu cầu tham gia đội mới',
      content: `${currentUser.username || 'Một người dùng'} muốn tham gia đội ${team.name}`,
      type: 'join_request',
      action: 'created',
      requestId: data.id,
      data: joinRequestPayload,
      extraPayload: joinRequestPayload,
    });

    return { success: true, message: Messages.joinRequestSent, data };
  }

  async getPendingJoinRequests(leaderUser: any, query: QueryJoinRequestsDto) {
    const leaderId = leaderUser.id;
    const { page = 1, limit = 10 } = query;
  
    const { data: team, error: teamError } = await this.supabase
      .from('team_rescue')
      .select('id')
      .eq('leader_id', leaderId)
      .single();
  
    if (teamError || !team) {
      throw new BadRequestException(Messages.teamNotFound);
    }
  
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    const { data, error, count } = await this.supabase
      .from('team_join_requests')
      .select(`
        id, request_message, status, created_at,
        users:user_id (
          id, username, phone, avatar
        )
      `, { count: 'exact' })
      .eq('team_id', team.id)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .range(from, to);
  
    if (error) {
      throw new BadRequestException(error.message);
    }
  
    return {
      data,
      count_request: count ?? 0,
      pagination: {
        total: count ?? 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    };
  }

  async respondToJoinRequest(requestId: string, leaderUser: any, dto: RespondJoinRequestDto) {
    const leaderId = leaderUser.id;
    const { status, response_message } = dto;

    const { data: joinRequest, error: requestError } = await this.supabase
      .from('team_join_requests')
      .select('*, team_rescue!inner(id, leader_id, name, province, phone)')
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

      const { error: memberInsertError } = await this.supabase
        .from('team_members')
        .insert([{ team_id: joinRequest.team_id, user_id: joinRequest.user_id, status: 'ACTIVE' }]);

      if (memberInsertError) {
        throw new BadRequestException(memberInsertError.message);
      }
    }

    const { data: leaderInfo } = await this.supabase
      .from('users')
      .select('username')
      .eq('id', leaderId)
      .single();

    const title = status === 'ACCEPTED' ? 'Yêu cầu được chấp nhận' : 'Yêu cầu bị từ chối';
    const body = response_message || (status === 'ACCEPTED'
      ? `Bạn đã được chấp nhận vào đội ${joinRequest.team_rescue.name}`
      : `Yêu cầu tham gia đội ${joinRequest.team_rescue.name} đã bị từ chối`);

    const responsePayload = {
      team_id: joinRequest.team_id,
      team_name: joinRequest.team_rescue.name,
      province: joinRequest.team_rescue.province,
      leader_name: leaderInfo?.username,
      leader_phone: joinRequest.team_rescue.phone,
      sent_at: joinRequest.created_at,
      reason: response_message,
    };

    await this.notificationService.createAndSend({
      userId: joinRequest.user_id,
      title,
      content: body,
      type: 'join_request',
      action: status.toLowerCase(),
      requestId,
      data: responsePayload,
      extraPayload: responsePayload,
    });

    return {
      success: true,
      message: status === 'ACCEPTED' ? Messages.joinRequestAccepted : Messages.joinRequestRejected,
    };
  }

  async getCurrentJoinRequest(userId: string) {
    const { data, error } = await this.supabase
      .from('team_join_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      success: true,
      statusCode: 200,
      data: data ?? [],
    };
  }


  async getMyTeamInfo(user: any) {
    const userId = user.id;

    const { data: membership, error: membershipError } = await this.supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (membershipError) {
      throw new BadRequestException(membershipError.message);
    }
    if (!membership) {
      throw new BadRequestException(Messages.notAMember);
    }

    const { data: team, error: teamError } = await this.supabase
      .from('team_rescue')
      .select('*')
      .eq('id', membership.team_id)
      .single();

    if (teamError || !team) {
      throw new BadRequestException(Messages.teamNotFound);
    }

    return team;
  }

  async getTeamMembers(user: any, query: QueryTeamMembersDto) {
    const userId = user.id;
    const { page = 1, limit = 10 } = query;
  
    const { data: membership, error: membershipError } = await this.supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle();
  
    if (membershipError) {
      throw new BadRequestException(membershipError.message);
    }
    if (!membership) {
      throw new BadRequestException(Messages.notAMember);
    }
  
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    const { data, error, count } = await this.supabase
      .from('team_members')
      .select(`
        id, status, joined_at,
        users:user_id (
          id, username, phone, avatar, roles
        )
      `, { count: 'exact' })
      .eq('team_id', membership.team_id)
      .eq('status', 'ACTIVE')
      .order('joined_at', { ascending: true })
      .range(from, to);
  
    if (error) {
      throw new BadRequestException(error.message);
    }
  
    return {
      data,
      count_member: count ?? 0,
      pagination: {
        total: count ?? 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    };
  }
 
  async kickMember(memberId: string, leaderUser: any, dto: KickMemberDto) {
    const leaderId = leaderUser.id;
    const { reason_kicked } = dto;
  
    const { data: team, error: teamError } = await this.supabase
      .from('team_rescue')
      .select('id, name')
      .eq('leader_id', leaderId)
      .single();
  
    if (teamError || !team) {
      throw new BadRequestException(Messages.teamNotFound);
    }
  
    if (memberId === leaderId) {
      throw new BadRequestException(Messages.cannotKickLeader);
    }
  
    const { data: membership, error: membershipError } = await this.supabase
      .from('team_members')
      .select('id')
      .eq('team_id', team.id)
      .eq('user_id', memberId)
      .eq('status', 'ACTIVE')
      .maybeSingle();
  
    if (membershipError || !membership) {
      throw new BadRequestException(Messages.memberNotFound);
    }
  
    const { error: updateMembershipError } = await this.supabase
      .from('team_members')
      .update({
        status: 'KICKED',
        removed_at: new Date().toISOString(),
        removed_by: leaderId,
        reason_kicked,
      })
      .eq('id', membership.id);
  
    if (updateMembershipError) {
      throw new BadRequestException(updateMembershipError.message);
    }
  
    const { error: userUpdateError } = await this.supabase
      .from('users')
      .update({ roles: 'GUEST', team_id: null })
      .eq('id', memberId);
  
    if (userUpdateError) {
      throw new BadRequestException(userUpdateError.message);
    }
  
    await this.notificationService.createAndSend({
      userId: memberId,
      title: 'Bạn đã bị loại khỏi đội',
      content: reason_kicked,
      type: 'team_membership',
      action: 'kicked',
      requestId: team.id,
      data: { team_id: team.id, team_name: team.name, reason_kicked },
      extraPayload: { team_id: team.id, team_name: team.name, reason_kicked },
    });
  
    return { success: true, message: Messages.memberKicked };
  }
  async getUserInfo(currentUser: any, targetUserId?: string) {
    const userId = targetUserId || currentUser.id;
  
    const { data, error } = await this.supabase
      .from('users')
      .select('id, username, avatar, dob, address, phone, roles, team_id, province')
      .eq('id', userId)
      .single();
  
    if (error || !data) {
      throw new BadRequestException(Messages.userNotFound);
    }
  
    return data;
  }
}