import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import axios from 'axios';
import { EventDto } from './dto/event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class EventsService {
  constructor(
      @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
      private readonly cloudinaryService: CloudinaryService,
    ) {}
  private distanceInMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (v: number) => (v * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async findEvents(dto: EventDto) {
    const { lat, lon, radius_meters } = dto;
    console.log("DTO received in service:", dto);

    try {
     

      const govEvents =  [];
      console.log("Government events fetched:", govEvents);

      /** 2️ Query SOS nội bộ */
      const { data: sosData, error } = await this.supabase
        .from('sos_request')
        .select('*');

      if (error) {
        throw new HttpException(
          `Không thể lấy dữ liệu yêu cầu SOS: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      /** 3️ Filter theo radius */
      const sosFiltered = radius_meters && lat && lon
        ? sosData.filter((sos) => {
            if (!sos.lat || !sos.lon) return false;

            const d = this.distanceInMeters(
              lat,
              lon,
              Number(sos.lat),
              Number(sos.lon),
            );

            return d <= radius_meters;
          })
        : sosData;

      /** 4️ Map SOS → event format */
      const sosEvents = sosFiltered.map((sos) => ({
        id: sos.id,
        description: sos.description,
        raw_content: sos.description,
        event_time: sos.created_at,
        lat: Number(sos.lat),
        lon: Number(sos.lon),
        location_name: sos.address_text,
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
      }));

      /** Merge + sort */
      const merged = [...govEvents, ...sosEvents].sort(
        (a, b) =>
          new Date(b.event_time).getTime() -
          new Date(a.event_time).getTime(),
      );

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
}
