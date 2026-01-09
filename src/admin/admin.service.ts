import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateTeamDto } from 'src/team/dto/create-team.dto';
import { UpdateEventDto } from './dto/update-events-dto';
import { stat } from 'fs';
import { UpdateWeightDto } from './dto/update-weight.dto';
import { UpdateUserDto } from './dto/update-user-dto';

@Injectable()
export class AdminService {
  constructor(
    private jwtService: JwtService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) { }

  async getAllUsers(limit: number, page: number) {
    console.log("limit",limit,"page",page);
    const offset = (page - 1) * limit;
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        *,
        auth (
          email
        )
      `)
      .range(offset, offset + limit - 1);
    if (error) {
      throw new Error(error.message);
    }
    const users = data.map(({ auth, ...user }) => ({
      ...user,
      email: auth?.email ?? null,
    }));
    return {
      success: true,
      users,
      pagination: {
        limit,
        page,
        total_items: data.length,
        total_pages: Math.ceil(data.length / limit),
      },
    };
  }
  async getAllTeams(limit: number, page: number) {
    const offset = (page - 1) * limit;
    const { data, error } = await this.supabase
      .from('team_rescue')
      .select('*')
      .range(offset, offset + limit - 1);
    if (error) {
      throw new Error(error.message);
    }
    return {
      success: true,
      data,
      pagination: {
        limit,
        page,
        total_items: data.length,
        total_pages: Math.ceil(data.length / limit),
      },
    };
  }
  async updateEventByAdmin(eventId: string, updateData: UpdateEventDto) {
    const eventUpdateData: any = { ...updateData };
  
    if (updateData.location_name !== undefined) {
      eventUpdateData.address_text = updateData.location_name;
      delete eventUpdateData.location_name;
    }
  
    if (updateData.code_type !== undefined) {
      eventUpdateData.type = updateData.code_type;
      delete eventUpdateData.code_type;
    }
  
    const { data, error } = await this.supabase
      .from('sos_request')
      .update(eventUpdateData)
      .eq('id', eventId)
      .select()
      .single();
  
    if (error) {
      throw new Error(error.message);
    }
  
    return {
      success: true,
      data,
    };
  }
  
  async updateEventStatus(eventId: string, status: string) {
    const { data, error } = await this.supabase
      .from('sos_request')
      .update({ status: status })
      .eq('id', eventId)
      .select()
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return {
      success: true,
      data
    };
  }
  async updateUser(userId: string, updateData: UpdateUserDto) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return {
      success: true,
      data
    };
  }
  async updateTeamStatus(teamId: string, status: string) {
    const {data,error} = await this.supabase
      .from('team_rescue')
      .update({ team_status: status })
      .eq('id', teamId)
      .select()
      .single();
      if (error) {
      throw new Error(error.message);
    }
    return {
      success: true,
      data
    };
  }
  async updateTeam(teamId:string,createTeamDto: CreateTeamDto){
    const {data,error} = await this.supabase
      .from('team_rescue')
      .update({...createTeamDto})
      .eq('id', teamId)
      .select()
      .single();
      if (error) {
      throw new Error(error.message);
    }
    return {
      success: true,
      data
    };
  }
  async getAllEvents(limit: number, page: number) {
    const offset = (page - 1) * limit;
    const { data, error } = await this.supabase
      .from('sos_request')
      .select('*')
      .neq('status',"REQUESTED")
      .range(offset, offset + limit - 1);
    if (error) {
      throw new Error(error.message);
    }
    return {
      success: true,
      data,
      pagination: {
        limit,
        page,
        total_items: data.length,
        total_pages: Math.ceil(data.length / limit),
      },
    };
  }
  async getAllRequestedEvents(limit: number, page: number) {
    const offset = (page - 1) * limit;
    
    // 1️⃣ Get total count
    const { count, error: countError } = await this.supabase
      .from('sos_request')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'REQUESTED');
  
    if (countError) {
      throw new Error(countError.message);
    }
  
    // 2️⃣ Get data with nested joins
    const { data, error } = await this.supabase
      .from('sos_request')
      .select(`
        *,
        origin:sos_request_origin!sos_request_origin_sos_request_id_fkey (
          id,
          description,
          type,
          created_at,
          ai_fixed:sos_request_ai_fixed!sos_request_ai_fixed_sos_origin_id_fkey (
            id,
            model_name,
            llm_name,
            llm_fixed_text,
            llm_category,
            llm_score,
            confidence,
            created_at,
            model_fixed_text
          )
        )
      `)
      .eq('status', 'REQUESTED')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
  
    if (error) {
      throw new Error(error.message);
    }
  
    return {
      success: true,
      data,
      pagination: {
        limit,
        page,
        total_items: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / limit),
      },
    };
  }
  async applyAiFixedsos(sosId: string, sosAiFixedId: string) {
    const { data, error } = await this.supabase
      .from('sos_request_ai_fixed')
      .select('*')
      .eq('id', sosAiFixedId)
      .single();
  
    if (error) {
      throw new Error(`Failed to fetch AI fixed data: ${error.message}`);
    }
  
    if (!data) {
      throw new Error('AI fixed data not found');
    }
    const { data: sosData, error: sosError } = await this.supabase
      .from('sos_request')
      .update({
        description: data.llm_fixed_text,  
        type: data.llm_category,
        is_ai_edited: true, 
        status: 'PENDING', 
      })
      .eq('id', sosId)
      .select()
      .single();
  
    if (sosError) {
      throw new Error(`Failed to update SOS request: ${sosError.message}`);
    }
  
    return {
      message: 'Đã áp dụng AI fix thành công',
      data: sosData,
    };
  }
  async viewWeightedScores() {
    const { data, error } = await this.supabase
      .from('sos_weight')
      .select('*')
     
    if (error) {
      throw new Error(`Failed to fetch weighted scores: ${error.message}`);
    }
    return {
      success: true,
      data
    };
  }
  async viewWeightTypes() {
    const { data, error } = await this.supabase
      .from('sos_type_weight')
      .select('*')

    if (error) {
      throw new Error(`Failed to fetch weight types: ${error.message}`);
    }
    return {
      success: true,
      data
    };
  }
  async updateWeightedScores(dto: UpdateWeightDto) {
    console.log("Updating weights with dto:", dto);
    const { distance, time, emergency_type, llm_description, team_size } = dto;
  
    const sum =
      distance + time + emergency_type + llm_description + team_size;
  
    
    if (Math.abs(sum - 1) > 0.0001) {
      throw new BadRequestException(
        'Total weight must equal 1',
      );
    }
  
    const updates = [
      { key: 'distance', weight: distance },
      { key: 'time', weight: time },
      { key: 'emergency_type', weight: emergency_type },
      { key: 'llm_description', weight: llm_description },
      { key: 'team_size', weight: team_size },
    ];
  
    const { error } = await this.supabase
      .from('sos_weight')
      .upsert(updates, { onConflict: 'key' });
  
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  
    return {
      message: 'Weights updated successfully',
      data: updates,
    };
  }
  async updateWeightTypes(typeId: string, base_score: number) {
    const { data, error } = await this.supabase
      .from('sos_type_weight')
      .update({ base_score: base_score })
      .eq('id', typeId)
      .select()
      .single();
    if (error) {
      throw new Error(`Failed to update weight type: ${error.message}`);
    }
    return {
      message: 'Weight type updated successfully',
      data,
    };
  }
    
}
