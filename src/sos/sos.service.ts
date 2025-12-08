import { Inject, Injectable } from '@nestjs/common';
import { CreateSosDto } from './dto/create-so.dto';
import { UpdateSosDto } from './dto/update-so.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class SosService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async requestSos(createSosDto: CreateSosDto, file: Express.Multer.File,user:any) {
    console.log("createSoDto",createSosDto.type);
    const imageUrl = file ? await this.cloudinaryService.uploadBufferFile(file) : null;
    const userId = user.id;
    console.log("userId",userId);
    const { data, error } = await this.supabase
      .from('sos_request')
      .insert([{
        ...createSosDto,
        image: imageUrl,
        userid: userId,
      }])
      .select()
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return{
      message: 'SOS request created successfully',
      data,
    }
  
  }
  async findAllSosRequests() {
    const { data, error } = await this.supabase
      .from('sos_request')
      .select('*');
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}
