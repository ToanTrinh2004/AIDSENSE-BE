import { Inject, Injectable } from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class TeamService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly cloudinaryService: CloudinaryService,
  ) { }
  async createTeam(createTeamDto: CreateTeamDto, file: Express.Multer.File, user: any) {

    const documentsUrl = file ? await this.cloudinaryService.uploadDocument(file) : null;
    const userId = user.id;
    const { data, error } = await this.supabase
      .from('team_rescue')
      .insert([{
        ...createTeamDto,
        document_url: documentsUrl,
        leader_id: userId,
      }])
      .select()
      .single();
      return{
        message: 'Team created successfully',
        data,
      }
  }
  async supporting(sosId: string, user: any) {
    //check team approved
    const teamId = await this.validateApprovedTeam(user);
    //check sos status
    await this.validateSosStatus(sosId, 'PENDING');
  //update sos request
    const { data } = await this.supabase
      .from('sos_request')
      .update({ status: 'IN_PROGRESS', teamId: teamId })
      .eq('id', sosId)
      .select()
      .single();
  
    return {
      message: 'Support request accepted',
      data,
    };
  }
  
  async unsupport(sosId: string, user: any) {
    //check team approved
    const teamId = await this.validateApprovedTeam(user);
    //check sos status
    await this.validateSosStatus(sosId, 'IN_PROGRESS');
    //update sos request
    const { data } = await this.supabase
      .from('sos_request')
      .update({ status: 'PENDING', teamId: null })
      .eq('id', sosId)
      .select()
      .single();
  
    return {
      message: 'Support request cancelled',
      data,
    };
  }
  
  async supported(sosId: string, user: any) {
    //check team approved
    const team = await this.validateApprovedTeam(user);
    //check sos status
    await this.validateSosStatus(sosId, 'IN_PROGRESS');
    //update sos request
    const { data } = await this.supabase
      .from('sos_request')
      .update({ status: 'COMPLETE' })
      .eq('id', sosId)
      .select()
      .single();
  
    return {
      message: 'Support request completed',
      data,
    };
  }
  
  //support func
  private async validateApprovedTeam(user: any) {
    const leaderId = user.id;

  const { data, error } = await this.supabase
    .from('team_rescue')
    .select('id, team_status')
    .eq('leader_id', leaderId)
    .single();

  if (error || !data || data.team_status !== 'APPROVED') {
    throw new Error('Invalid team');
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
      throw new Error(`SOS request not found or not in status: ${expectedStatus}`);
    }
    console.log("SOS Data:", data);
  
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
      throw new Error('Team not found');
    }
    return data;
  }
  async getSosByTeam(user: any) {
    const teamId = await this.validateApprovedTeam(user);
    const { data, error } = await this.supabase
      .from('sos_request')
      .select('*')
      .eq('teamId', teamId);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
  

}
