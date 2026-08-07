import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateSosDto } from './dto/sos.dto';
import { UpdateSosDto } from './dto/sos.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ClaudeNlpService } from './claude-nlp.service';
import Redis from 'ioredis';

// ── Security 3: IP cooldown constants ─────────────────────────────────────────
const IP_COOLDOWN_SECONDS = 300; // 5 min between unauth SOS per IP
const IP_COOLDOWN_PREFIX = 'sos:unauth:ip:';

@Injectable()
export class SosService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly cloudinaryService: CloudinaryService,
    private readonly claudeNlp: ClaudeNlpService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async canCreateSos(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('sos_request')
      .select('id')
      .eq('userid', userId)
      .eq('status', 'REQUESTED')
      .limit(1);

    if (error) throw new Error(error.message);
    return data.length === 0;
  }

  private async processAiInBackground(
    sosOriginId: string,
    description: string,
    sosRequestId: string,
  ) {
    try {
      const result = await this.claudeNlp.processSos(description);

      await this.supabase.from('sos_request_ai_fixed').insert({
        sos_origin_id: sosOriginId,
        model_fixed_text: result.model_text,
        llm_fixed_text: result.llm_text,
        llm_category: result.llm_category,
        confidence: result.confidence,
        llm_name: result.llm_name,
        model_name: result.model_name,
        llm_score: result.llm_score,
      });

      await this.supabase
        .from('sos_request')
        .update({ llm_score: result.llm_score })
        .eq('id', sosRequestId);
    } catch (err) {
      console.error('[AI_PROCESS_FAILED]', sosOriginId, err.message);
    }
  }

  async requestSos(
    createSosDto: CreateSosDto,
    file: Express.Multer.File,
    user: any,
  ) {
    try {
      const canCreate = await this.canCreateSos(user.id);
      if (!canCreate) {
        throw new BadRequestException(
          'Người dùng đã có yêu cầu SOS đang chờ xử lý',
        );
      }

      const imageUrl = file
        ? await this.cloudinaryService.uploadBufferFile(file)
        : null;

        let province: string | null = null;
        if (createSosDto.lat && createSosDto.lon) {
          province = await this.getProvinceFromCoords(createSosDto.lat, createSosDto.lon);
        }

      const { data: sos, error: sosError } = await this.supabase
        .from('sos_request')
        .insert({
          type: createSosDto.type,
          lat: createSosDto.lat,
          lon: createSosDto.lon,
          description: createSosDto.description,
          userid: user.id,
          image: imageUrl,
          phone: createSosDto.phone,
          address_text: createSosDto.address_text,
          location: `SRID=4326;POINT(${createSosDto.lon} ${createSosDto.lat})`,
          status: 'REQUESTED',
          province: province,
        })
        .select()
        .single();

      if (sosError) throw new Error(sosError.message);

      const { data: origin, error: originError } = await this.supabase
        .from('sos_request_origin')
        .insert({
          sos_request_id: sos.id,
          description: createSosDto.description,
          type: createSosDto.type ?? null,
        })
        .select()
        .single();

      if (originError) throw new Error(originError.message);

      
      this.processAiInBackground(origin.id, origin.description, sos.id);

      return {
        message: 'SOS request khởi tạo thành công',
        data: sos,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('[requestSos]', error);
      throw new InternalServerErrorException('Không thể tạo SOS');
    }
  }

  async sosRequestWithoutUser(
    createSosDto: CreateSosDto,
    file: Express.Multer.File,
    ip: string,
  ) {
    // ── Security 3: IP cooldown check ───────────────────────────────────────
    const cooldownKey = `${IP_COOLDOWN_PREFIX}${ip}`;
    const existing = await this.redis.get(cooldownKey);
    if (existing) {
      throw new BadRequestException(
        'Vui lòng chờ 5 phút trước khi gửi yêu cầu SOS mới.',
      );
    }
    // Set cooldown BEFORE processing (prevents race condition spam)
    await this.redis.set(cooldownKey, '1', 'EX', IP_COOLDOWN_SECONDS);

    try {
      const imageUrl = file
        ? await this.cloudinaryService.uploadBufferFile(file)
        : null;

      const { data: sos, error: sosError } = await this.supabase
        .from('sos_request')
        .insert({
          type: createSosDto.type,
          lat: createSosDto.lat,
          lon: createSosDto.lon,
          description: createSosDto.description,
          image: imageUrl,
          phone: createSosDto.phone,
          address_text: createSosDto.address_text,
          location: `SRID=4326;POINT(${createSosDto.lon} ${createSosDto.lat})`,
          status: 'REQUESTED',
        })
        .select()
        .single();

      if (sosError) throw new Error(sosError.message);

      const { data: origin, error: originError } = await this.supabase
        .from('sos_request_origin')
        .insert({
          sos_request_id: sos.id,
          description: createSosDto.description,
          type: createSosDto.type ?? null,
        })
        .select()
        .single();

      if (originError) throw new Error(originError.message);

      this.processAiInBackground(origin.id, origin.description, sos.id);

      return {
        message: 'SOS request khởi tạo thành công',
        data: sos,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('[sosRequestWithoutUser]', error);
      throw new InternalServerErrorException('Không thể tạo SOS');
    }
  }

  async findAllSosRequests() {
    const { data, error } = await this.supabase
      .from('sos_request')
      .select('*')
      .eq('status', 'PENDING');
    if (error) throw new Error(error.message);
    return data;
  }

  async convertPlace(lat: number, lon: number): Promise<string> {
    const res = await fetch(
      `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}&api_key=${process.env.GEOCODING_API_KEY}`,
    );
    if (!res.ok) throw new Error('Reverse geocode failed');
    const data = await res.json();
    console.log(data)
    return data.display_name ?? 'Không xác định';
  }
  private normalizeProvince(text: string): string | null {
    const input = text
      .normalize('NFC')
      .toLowerCase()
      .trim();
  
    const provinces: Record<string, string> = {
      // Municipalities
      'thành phố hồ chí minh': 'Thành phố Hồ Chí Minh',
      'hồ chí minh': 'Thành phố Hồ Chí Minh',
      'ho chi minh city': 'Thành phố Hồ Chí Minh',
      'tp hồ chí minh': 'Thành phố Hồ Chí Minh',
      'tp. hồ chí minh': 'Thành phố Hồ Chí Minh',
  
      'thành phố hà nội': 'Thành phố Hà Nội',
      'hà nội': 'Thành phố Hà Nội',
  
      'thành phố hải phòng': 'Thành phố Hải Phòng',
      'hải phòng': 'Thành phố Hải Phòng',
  
      'thành phố đà nẵng': 'Thành phố Đà Nẵng',
      'đà nẵng': 'Thành phố Đà Nẵng',
  
      'thành phố huế': 'Thành phố Huế',
      'huế': 'Thành phố Huế',
      'thừa thiên huế': 'Thành phố Huế',
  
      'thành phố cần thơ': 'Thành phố Cần Thơ',
      'cần thơ': 'Thành phố Cần Thơ',
  
      // Provinces
      'cao bằng': 'Cao Bằng',
      'tuyên quang': 'Tuyên Quang',
      'điện biên': 'Điện Biên',
      'lai châu': 'Lai Châu',
      'sơn la': 'Sơn La',
      'lào cai': 'Lào Cai',
      'thái nguyên': 'Thái Nguyên',
      'lạng sơn': 'Lạng Sơn',
      'quảng ninh': 'Quảng Ninh',
      'bắc ninh': 'Bắc Ninh',
      'phú thọ': 'Phú Thọ',
      'hưng yên': 'Hưng Yên',
      'ninh bình': 'Ninh Bình',
      'thanh hóa': 'Thanh Hóa',
      'nghệ an': 'Nghệ An',
      'hà tĩnh': 'Hà Tĩnh',
      'quảng trị': 'Quảng Trị',
      'quảng ngãi': 'Quảng Ngãi',
      'gia lai': 'Gia Lai',
      'khánh hòa': 'Khánh Hòa',
      'đắk lắk': 'Đắk Lắk',
      'lâm đồng': 'Lâm Đồng',
      'đồng nai': 'Đồng Nai',
      'tây ninh': 'Tây Ninh',
      'đồng tháp': 'Đồng Tháp',
      'vĩnh long': 'Vĩnh Long',
      'an giang': 'An Giang',
      'cà mau': 'Cà Mau',
    };
  
    for (const [key, value] of Object.entries(provinces)) {
      if (input.includes(key)) {
        return value;
      }
    }
  
    return null;
  }
  async getProvinceFromCoords(
    lat: number,
    lon: number,
  ): Promise<string | null> {
    try {
      const res = await fetch(
        `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}&api_key=${process.env.GEOCODING_API_KEY}`,
      );
  
      if (!res.ok) {
        return null;
      }
  
      const data = await res.json();
      const address = data.address ?? {};
  
      // Ensure Vietnam
      if (address.country_code?.toLowerCase() !== 'vn') {
        return null;
      }
  
      // Try structured address fields first
      const fields = [
        address.state,
        address.province,
        address.city,
        address.county,
        address.state_district,
        address.region,
        address.municipality,
      ].filter(Boolean);
  
      for (const field of fields) {
        const province = this.normalizeProvince(field);
        if (province) {
          return province;
        }
      }
  
      // Fallback to display_name
      if (data.display_name) {
        const province = this.normalizeProvince(data.display_name);
        if (province) {
          return province;
        }
      }
  
      console.warn(
        '[getProvinceFromCoords] Unable to determine province',
        JSON.stringify(data, null, 2),
      );
  
      return null;
    } catch (err) {
      console.error('[getProvinceFromCoords]', err);
      return null;
    }
  }
}