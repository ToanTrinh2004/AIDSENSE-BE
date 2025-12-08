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
        .select('*')
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
      return { message: 'Sos request cancelled successfully'};
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
      return { message: 'Sos request completed successfully'};
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


}
