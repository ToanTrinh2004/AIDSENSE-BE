import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { QueryMySosDto, UpdateProfileDto } from './dto/user.dto';
import { Messages } from 'src/utils/messages';

@Injectable()
export class UserService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async viewMySosRequests(user: any, query: QueryMySosDto) {
    const userId = user.id;
  
    const { page = 1, limit = 10 } = query;
  
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    const { data, error, count } = await this.supabase
      .from('sos_request')
      .select(
        `
        *,
        team_rescue (
          name,
          leader,
          phone
        )
        `,
        {
          count: 'exact',
        },
      )
      .eq('userid', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
  
    if (error) {
      throw new Error(error.message);
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

  async cancelSosRequest(sosId: string, user: any) {
    const userId = user.id;
    const { data, error } = await this.supabase
      .from('sos_request')
      .update({ status: 'CANCELED', teamId: null })
      .eq('id', sosId)
      .eq('userid', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return { message: 'Hủy yêu cầu sos thành công' };
  }

  async completeSosRequest(sosId: string, user: any) {
    const userId = user.id;
    const { data, error } = await this.supabase
      .from('sos_request')
      .update({ status: 'COMPLETE' })
      .eq('id', sosId)
      .eq('userid', userId)
      .select()
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return { message: 'Đánh dấu hoàn thành yêu cầu sos thành công' };
  }

  async viewMyProfile(user: any) {
    const userId = user.id;
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async updateProfile(user: any, updateProfileDto: UpdateProfileDto, avatarFile?: Express.Multer.File) {
    const userId = user.id;
    const avatarUrl = avatarFile ? await this.cloudinaryService.uploadDocument(avatarFile) : null;
    const updateData: any = { ...updateProfileDto };
    if (avatarUrl) {
      updateData.avatar = avatarUrl;
    }

    const { data, error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
  async findUsersBySameProvince(user: any) {
    const userId = user.id;
  
    const { data: currentUser, error: currentUserError } = await this.supabase
      .from('users')
      .select('province')
      .eq('id', userId)
      .single();
  
    if (currentUserError) {
      throw new BadRequestException({
        vi: `${Messages.cannotFetchUserProvince.vi}: ${currentUserError.message}`,
        en: `${Messages.cannotFetchUserProvince.en}: ${currentUserError.message}`,
      });
    }
  
    if (!currentUser?.province) {
      throw new BadRequestException(Messages.provinceNotSet);
    }
  
    const { data, error } = await this.supabase
      .from('users')
      .select('id, username, phone, province, avatar')
      .eq('province', currentUser.province)
      .neq('id', userId);
  
    if (error) {
      throw new BadRequestException({
        vi: `${Messages.cannotFetchSameProvinceUsers.vi}: ${error.message}`,
        en: `${Messages.cannotFetchSameProvinceUsers.en}: ${error.message}`,
      });
    }
  
    return data;
  }
  async updateFcmToken(user: any, fcmToken: string, platform: 'android' | 'ios') {
    const userId = user.id;
    const column = platform === 'ios' ? 'fcm_token_ios' : 'fcm_token_android';
  
    const { error } = await this.supabase
      .from('users')
      .update({ [column]: fcmToken })
      .eq('id', userId);
  
    if (error) {
      throw new BadRequestException(error.message);
    }
  
    return { success: true, message: Messages.fcmTokenUpdated };
  }
}