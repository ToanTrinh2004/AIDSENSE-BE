import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import axios from 'axios';
import { EventDto } from './dto/event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ScoreDto } from './dto/score.dto';

@Injectable()
export class EventsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async findEvents(dto: EventDto, user?: any) {
    const { lat, lon, radius_meters, time_window } = dto;
    let teamScore = 0;
    let teamData: any = null;

    if (user?.team_id) {
      const { data, error } = await this.supabase
        .from('team_rescue')
        .select('team_size')
        .eq('id', user.team_id)
        .single();

      if (error) {
        console.warn('Cannot fetch team size:', error.message);
      } else {
        teamData = data;
      }
    }

    teamScore = this.calculateTeamSizeScore(teamData?.team_size || "");


    try {


      const govEvents = [];
      let sosData: any[] = [];

      // 1️⃣ Fetch SOS data with distance
      if (lat != null && lon != null && radius_meters != null) {
        const { data, error } = await this.supabase.rpc(
          'get_sos_within_radius_with_distance',
          {
            search_lat: Number(lat),
            search_lon: Number(lon),
            radius_meters: Number(radius_meters), // 0 or >0 đều OK
          },
        );
      
        if (error) throw new Error(error.message);
        sosData = data ?? [];
      }

      // 2️⃣ Time window filter
      if (time_window) {
        const now = new Date();

        sosData = sosData.filter((sos) => {
          const eventTime = new Date(sos.created_at);
          const diffHours =
            (now.getTime() - eventTime.getTime()) / (1000 * 60 * 60);

          switch (time_window) {
            case '12h':
              return diffHours <= 12;
            case '24h':
              return diffHours <= 24;
            case '48h':
              return diffHours <= 48;
            default:
              return true;
          }
        });
      }


      const sosEvents = sosData.map((sos) => {
        const totalScore =
          (sos.distance_score ?? 0) +
          (sos.time_score ?? 0) +
          (sos.base_score ?? 0) +
          (sos.llm_score ?? 0);

        return {
          id: sos.id,
          description: sos.description,
          raw_content: sos.description,
          event_time: sos.created_at,
          lat: sos.lat ? Number(sos.lat) : null,
          lon: sos.lon ? Number(sos.lon) : null,
          location_name: sos.address_text,
          status : sos.status,

          /* 📏 distance */
          distance: sos.distance_meters
            ? Math.round(sos.distance_meters)
            : null,

          /* 🧠 scoring breakdown */
          score: {
            team_size_score: teamScore,
            distance_score: sos.distance_score ?? 0,
            time_score: sos.time_score ?? 0,
            base_score: sos.base_score ?? 0,
            llm_score: sos.llm_score ?? 0,
            total_score: Number(totalScore.toFixed(5)),
          },

          event_type: {
            code: sos.type,
            name: '',
            group: {
              code: 'USER',
              name: '',
            },
          },

          images: sos.image ? [sos.image] : [],
          whitelisted: true,
          source: 'internal',
        };
      });


      // 4️⃣ Merge + sort by distance (closest first)
      const merged = [...govEvents, ...sosEvents].sort((a, b) => {
        if (a.distance != null && b.distance != null) {
          return a.distance - b.distance;
        }
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return (
          new Date(b.event_time).getTime() -
          new Date(a.event_time).getTime()
        );
      });

      return {
        code: 2000,
        message: 'Thành công',
        data: { events: merged },
      };
    } catch (error) {
      console.error('Lỗi trong findEvents:', error.message);
      throw new HttpException(
        'Không thể lấy sự kiện. Vui lòng thử lại sau.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  private calculateDistanceScore(distanceKm: number): number {
    if (distanceKm <= 1) return 1.0;
    if (distanceKm <= 3) return 0.85;
    if (distanceKm <= 5) return 0.7;
    if (distanceKm <= 10) return 0.4;
    return 0.1;
  }
  private calculateTeamSizeScore(teamSize: string): number {
    if (teamSize == "SMALL") return 0.3;
    if (teamSize == "MEDIUM") return 0.5;
    if (teamSize == "LARGE") return 0.7;
    return 0.0;
  }
  async calculateScoreForEvents(dto: ScoreDto, weight?: any, weight_type?: any) {
    try {

      const distanceScore = this.calculateDistanceScore(dto.distanceKm) * weight!.find(w => w.key === 'distance')!.weight;
      console.log('Distance Score:', distanceScore);
      const teamSizeScore = this.calculateTeamSizeScore(dto.teamSize.toString()) * weight!.find(w => w.key === 'team_size')!.weight;
      console.log('Team Size Score:', teamSizeScore);
      const emergencyTypeWeight = weight_type!.find(wt => wt.type_code === dto.emergencyType)?.weight || 0;
      console.log('Emergency Type Weight:', emergencyTypeWeight);
      const emergencyTypeScore = emergencyTypeWeight * weight!.find(w => w.key === 'emergency_type')!.weight;
      console.log('Emergency Type Score:', emergencyTypeScore);
      const timeFromAssignedScore = Math.max(0, (1 - dto.timeFromAssignedMinutes / 2880)) * weight!.find(w => w.key === 'time')!.weight;
      console.log('Time From Assigned Score:', timeFromAssignedScore);
      const llm_score = dto.llm_score * weight!.find(w => w.key === 'llm_description')!.weight;
      console.log('LLM Score:', llm_score);
      const totalScore = distanceScore + teamSizeScore + emergencyTypeScore + timeFromAssignedScore + llm_score;
      console.log('Total Score:', totalScore);
      return {
        total_score: totalScore,
        breakdown: {
          distanceScore,
          teamSizeScore,
          emergencyTypeScore,
          timeFromAssignedScore,
          llm_score
        }
      };


    }
    catch (error) {
      console.error('Lỗi trong calculateScoreForEvents:', error.message);
      throw new HttpException(
        'Không thể tính điểm sự kiện. Vui lòng thử lại sau.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}