import { BadRequestException, HttpException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateSosDto } from './dto/create-so.dto';
import { UpdateSosDto } from './dto/update-so.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import axios from 'axios';

@Injectable()
export class SosService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async canCreateSos(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('sos_request')
      .select('id')
      .eq('userid', userId)
      .eq('status', 'REQUESTED')
      .limit(1);
  
    if (error) {
      throw new Error(error.message);
    }
  
    return data.length === 0;
  }
  private async processAiInBackground(
    sosOriginId: string,
    description: string,
    sosRequestId : string
  ) {
    try {
      const res = await axios.post(
        'http://127.0.0.1:8001/process-sos',
        { text: description },
        { timeout: 30000 } // 30 seconds timeout
      );
  
      const {
        model_text,
        llm_text,
        llm_category,
        llm_name,
        model_name,
        confidence,
        llm_score,
      } = res.data;
      console.log(llm_text)
  
      await this.supabase.from('sos_request_ai_fixed').insert({
        sos_origin_id: sosOriginId,
        model_fixed_text: model_text,
        llm_fixed_text: llm_text,
        llm_category : llm_category,
        confidence : confidence,
        llm_name :llm_name,
        model_name:model_name,
        llm_score : llm_score,
      });
      await this.supabase.from('sos_request').update({
        llm_score: llm_score,
      }).eq('id',sosRequestId);
    } catch (err) {
      console.error(
        '[AI_PROCESS_FAILED]',
        sosOriginId,
        err.message
      );
    }
  }
  
  async requestSos(
    createSosDto: CreateSosDto,
    file: Express.Multer.File,
    user: any
  ) {
    try {
      // check if user can create sos
      const canCreate = await this.canCreateSos(user.id);
      if (!canCreate) {
        throw new BadRequestException(
          'Người dùng đã có yêu cầu SOS đang chờ xử lý'
        );
      }
  
     // upload image if exists
      const imageUrl = file
        ? await this.cloudinaryService.uploadBufferFile(file)
        : null;
  
          // insert sos origin and sos request
      const { data: sos, error: sosError } = await this.supabase
        .from('sos_request')
        .insert({
          type: createSosDto.type,
          lat : createSosDto.lat,
          lon : createSosDto.lon,
          description: createSosDto.description,
          userid: user.id,
          image: imageUrl,
          phone: createSosDto.phone,
          address_text: createSosDto.address_text,
          location : `SRID=4326;POINT(${createSosDto.lon} ${createSosDto.lat})`,
          status: 'REQUESTED',
        })
        .select()
        .single();
  
      if (sosError) {
        throw new Error(sosError.message);
      }
  
   
      const { data: origin, error: originError } = await this.supabase
        .from('sos_request_origin')
        .insert({
          sos_request_id: sos.id,
          description: createSosDto.description,
          type: createSosDto.type ?? null,
        })
        .select()
        .single();
  
      if (originError) {
        throw new Error(originError.message);
      }
  
    
     
      // process AI in background
      
      this.processAiInBackground(origin.id, origin.description,sos.id);
  
 
      return {
        message: 'SOS request khởi tạo thành công',
        data: sos,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; 
      }
      console.error('[requestSos]', error);
      throw new InternalServerErrorException('Không thể tạo SOS');
    }
  }
   
  async sosRequestWithoutUser(createSosDto: CreateSosDto, file: Express.Multer.File) {
    try {
     
     // upload image if exists
      const imageUrl = file
        ? await this.cloudinaryService.uploadBufferFile(file)
        : null;
  
          // insert sos origin and sos request
      const { data: sos, error: sosError } = await this.supabase
        .from('sos_request')
        .insert({
          type: createSosDto.type,
          lat : createSosDto.lat,
          lon : createSosDto.lon,
          description: createSosDto.description,
          image: imageUrl,
          phone: createSosDto.phone,
          address_text: createSosDto.address_text,
          location : `SRID=4326;POINT(${createSosDto.lon} ${createSosDto.lat})`,
          status: 'REQUESTED',
        })
        .select()
        .single();
  
      if (sosError) {
        throw new Error(sosError.message);
      }
  
   
      const { data: origin, error: originError } = await this.supabase
        .from('sos_request_origin')
        .insert({
          sos_request_id: sos.id,
          description: createSosDto.description,
          type: createSosDto.type ?? null,
        })
        .select()
        .single();
  
      if (originError) {
        throw new Error(originError.message);
      }
  
    
     
      // process AI in background
      
      this.processAiInBackground(origin.id, origin.description,sos.id);
  
 
      return {
        message: 'SOS request khởi tạo thành công',
        data: sos,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; 
      }
      console.error('[requestSos]', error);
      throw new InternalServerErrorException('Không thể tạo SOS');
    }
  }
  
  async findAllSosRequests() {
    const { data, error } = await this.supabase
      .from('sos_request')
      .select('*')
      .eq('status', 'PENDING');
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
   async convertPlace(lat: number, lon: number): Promise<string> {
    const res = await fetch(
      `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}&api_key=${process.env.GEOCODING_API_KEY}`,
    );
  
    if (!res.ok) {
      throw new Error('Reverse geocode failed');
    }
  
    const data = await res.json();
  
    
  
    return data.display_name ?? 'Không xác định';
  }
  
  
}
