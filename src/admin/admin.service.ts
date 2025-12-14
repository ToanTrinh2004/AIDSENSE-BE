import { Inject, Injectable } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateTeamDto } from 'src/team/dto/create-team.dto';
import { UpdateEventDto } from './dto/update-events-dto';

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
  async updateUser(userId: string, updateData: any) {
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
}
