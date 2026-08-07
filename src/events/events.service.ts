import { Injectable, HttpException, HttpStatus, Inject, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { EventDto, QuerySosDto, ViewportQueryDto } from './dto/event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ScoreDto } from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) { }
  private readonly MAX_MARKERS = 500;       // ngưỡng marker thật tối đa 1 lần trả về
  private readonly CLUSTER_ZOOM_THRESHOLD = 12;

  private getClusterDistanceForZoom(zoom: number): number {
    if (zoom <= 6) return 200000;   // 200km
    if (zoom <= 8) return 50000;    // 50km
    if (zoom <= 10) return 10000;   // 10km
    if (zoom <= 12) return 2000;    // 2km
    if (zoom <= 14) return 500;     // 500m
    return 100;                     // 100m
  }
  private getMinCreatedAt(timeWindow?: string): string | null {
    if (!timeWindow) return null;
  
    const now = new Date();
    const hoursMap: Record<string, number> = { '12h': 12, '24h': 24, '48h': 48 };
    const hours = hoursMap[timeWindow];
    if (!hours) return null;
  
    return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  }
  
  async getSosForViewport(dto: ViewportQueryDto) {
    const { north, south, east, west, zoom, status, time_window } = dto;
    const minCreatedAt = this.getMinCreatedAt(time_window);
  
    if (zoom < this.CLUSTER_ZOOM_THRESHOLD) {
      return this.getClusters(dto, status, minCreatedAt);
    }
  
    let countRequest = this.supabase
      .from('sos_request')
      .select('id', { count: 'exact', head: true })
      .gte('lat', south)
      .lte('lat', north)
      .gte('lon', west)
      .lte('lon', east);
  
    if (status) {
      countRequest = countRequest.eq('status', status);
    }
    if (minCreatedAt) {
      countRequest = countRequest.gte('created_at', minCreatedAt);
    }
  
    const { count, error: countError } = await countRequest;
  
    if (countError) {
      throw new BadRequestException(countError.message);
    }
  
    if ((count ?? 0) > this.MAX_MARKERS) {
      return this.getClusters(dto, status, minCreatedAt);
    }
  
    const { data, error } = await this.supabase.rpc('get_sos_markers_in_viewport', {
      min_lat: south,
      min_lon: west,
      max_lat: north,
      max_lon: east,
      max_results: this.MAX_MARKERS,
      status_filter: status ?? null,
      min_created_at: minCreatedAt,
    });
  
    if (error) {
      throw new BadRequestException(error.message);
    }
  
    return {
      type: 'markers',
      total: data?.length ?? 0,
      data,
    };
  }
  
  private async getClusters(dto: ViewportQueryDto, status?: string, minCreatedAt?: string | null) {
    const { north, south, east, west, zoom } = dto;
    const gridSize = this.getClusterDistanceForZoom(zoom);
  
    const { data, error } = await this.supabase.rpc('get_sos_clusters_postgis', {
      min_lat: south,
      min_lon: west,
      max_lat: north,
      max_lon: east,
      cluster_distance_meters: gridSize,
      status_filter: status ?? null,
      min_created_at: minCreatedAt,
    });
  
    if (error) {
      throw new BadRequestException(error.message);
    }
  
    return {
      type: 'clusters',
      total: data?.length ?? 0,
      data,
    };
  }
  
  async getSosList(query: QuerySosDto) {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      userid,
      teamId,
      time_window,
      is_ai_edited,
      search,
    } = query;
  
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    let request = this.supabase
      .from('sos_request')
      .select('*', { count: 'exact' });
  
    if (status) {
      request = request.eq('status', status);
    }
    if (type) {
      request = request.eq('type', type);
    }
    if (userid) {
      request = request.eq('userid', userid);
    }
    if (teamId) {
      request = request.eq('teamId', teamId);
    }
    if (is_ai_edited !== undefined) {
      request = request.eq('is_ai_edited', is_ai_edited);
    }
    if (search) {
      request = request.or(`description.ilike.%${search}%,address_text.ilike.%${search}%`);
    }
  
    const minCreatedAt = this.getMinCreatedAt(time_window);
    if (minCreatedAt) {
      request = request.gte('created_at', minCreatedAt);
    }
  
    const { data, error, count } = await request
      .order('created_at', { ascending: false })
      .range(from, to);
  
    if (error) {
      throw new BadRequestException(error.message);
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
}