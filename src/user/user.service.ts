import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
      @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
      private readonly cloudinaryService: CloudinaryService,
    ) { }

    async viewMySosRequests(user: any) {
      const userId = user.id;
      const { data, error } = await this.supabase
    .from('sos_request')
    .select(`
      *,
      team_rescue (
        name,
        leader,
        phone
      )
    `)
    .eq('userid', userId);
      if (error) {
        throw new Error(error.message);
      }
      return data;
    }

    async cancelSosRequest(sosId: string, user: any) {
      const userId = user.id;
      const { data, error } = await this.supabase
        .from('sos_request')
        .update({ status: 'CANCELED',teamId: null })
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
    async updateProfile(user: any, updateProfileDto: any,avatarFile?: Express.Multer.File) {
      const userId = user.id;
      console.log('userId:', userId);
      const avatarUrl =avatarFile ? await this.cloudinaryService.uploadDocument(avatarFile) : null;
      const updateData: any = { ...updateProfileDto };
      if (avatarUrl) {
        updateData.avatar = avatarUrl;
      }
      
      console.log('Update Data:', updateData);
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



}
