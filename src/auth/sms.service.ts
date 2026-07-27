import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import axios from 'axios';
import Redis from 'ioredis';

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_REDIS_PREFIX = 'otp:';

export enum OtpVerifyResult {
  SUCCESS = 'SUCCESS',
  EXPIRED = 'EXPIRED',      // không tìm thấy / hết hạn
  MISMATCH = 'MISMATCH',    // sai mã
}

@Injectable()
export class SmsService {
  private readonly apiKey = process.env.ESMS_API_KEY ?? '';
  private readonly secretKey = process.env.ESMS_SECRET_KEY ?? '';
  private readonly baseUrl =
    'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/';

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private normalisePhone(phone: string): string {
    let p = phone.trim();
    if (p.startsWith('+84')) p = '0' + p.slice(3);
    else if (p.startsWith('84') && p.length === 11) p = '0' + p.slice(2);
    return p;
  }

  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async sendOtp(phone: string): Promise<void> {
    const normalisedPhone = this.normalisePhone(phone);
    const otp = this.generateOtp();
    const redisKey = `${OTP_REDIS_PREFIX}${normalisedPhone}`;

    await this.redis.set(redisKey, otp, 'EX', OTP_TTL_SECONDS);

    const content = `${otp} la ma xac minh dang ky Baotrixemay cua ban`;

    const body = {
      ApiKey: this.apiKey,
      SecretKey: this.secretKey,
      Phone: normalisedPhone,
      Content: content,
      Brandname: 'Baotrixemay',
      SmsType: '2',
      IsUnicode: '0',
    };

    console.log(`[SmsService] Sending OTP ${otp} to ${normalisedPhone}`);

    try {
      const response = await axios.post(this.baseUrl, body, {
        headers: { 'Content-Type': 'application/json' },
      });
      const data = response.data;

      console.log('[SmsService] eSMS response:', JSON.stringify(data));

      if (data?.CodeResult !== '100') {
        throw new BadRequestException(
          'Không thể gửi OTP: ' + (data?.ErrorMessage ?? `Code ${data?.CodeResult}`),
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const msg = (err as any)?.response?.data?.ErrorMessage ?? (err as any)?.message;
      console.error('[SmsService] eSMS error:', msg);
      throw new BadRequestException('Không thể gửi OTP qua SMS: ' + msg);
    }
  }

 
  async verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
    const normalisedPhone = this.normalisePhone(phone);
    const redisKey = `${OTP_REDIS_PREFIX}${normalisedPhone}`;

    const storedOtp = await this.redis.get(redisKey);

    if (!storedOtp) {
      return OtpVerifyResult.EXPIRED;
    }

    if (storedOtp !== code.toString()) {
      return OtpVerifyResult.MISMATCH;
    }

    await this.redis.del(redisKey);
    return OtpVerifyResult.SUCCESS;
  }
}