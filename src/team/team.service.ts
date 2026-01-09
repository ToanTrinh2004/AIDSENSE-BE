import { Inject, Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import Redis from 'ioredis';

@Injectable()
export class TeamService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly cloudinaryService: CloudinaryService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

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
      // 1️⃣ Check existing pending team by leader
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
  
      // 2️⃣ Upload + insert team
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
  
      // 3️⃣ Update user role
      const { error: userUpdateError } = await this.supabase
        .from('users')
        .update({
          roles: 'TEAM_LEADER',
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

    if (error ) {
      throw new HttpException('Không tìm thấy đội cứu trợ', HttpStatus.BAD_REQUEST);
    }

  
    return {
      message: 'Lấy danh sách SOS thành công',
      data,
    };
  }
}
