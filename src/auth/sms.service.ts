import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import axios from 'axios';
import Redis from 'ioredis';

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_REDIS_PREFIX = 'otp:';

@Injectable()
export class SmsService {
  private readonly apiKey = process.env.ESMS_API_KEY ?? '';
  private readonly secretKey = process.env.ESMS_SECRET_KEY ?? '';
  private readonly baseUrl =
    'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/';

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /** Normalise Vietnamese phone to local format (09xx) required by eSMS */
  private normalisePhone(phone: string): string {
    let p = phone.trim();
    if (p.startsWith('+84')) p = '0' + p.slice(3);
    else if (p.startsWith('84') && p.length === 11) p = '0' + p.slice(2);
    return p;
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate OTP → store in Redis → send via eSMS Baotrixemay demo template
   * Template: "{CODE} la ma xac minh dang ky Baotrixemay cua ban"
   */
  async sendOtp(phone: string): Promise<void> {
    const normalisedPhone = this.normalisePhone(phone);
    const otp = this.generateOtp();
    const redisKey = `${OTP_REDIS_PREFIX}${normalisedPhone}`;

    // Save OTP to Redis with 5-minute TTL
    await this.redis.set(redisKey, otp, 'EX', OTP_TTL_SECONDS);

    // Must match the exact Baotrixemay demo template — only CODE can change
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

  /**
   * Verify OTP against value stored in Redis.
   * Deletes the key on success (one-time use).
   */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const normalisedPhone = this.normalisePhone(phone);
    const redisKey = `${OTP_REDIS_PREFIX}${normalisedPhone}`;

    const storedOtp = await this.redis.get(redisKey);

    if (!storedOtp) {
      throw new BadRequestException('OTP đã hết hạn hoặc chưa được gửi.');
    }

    if (storedOtp !== code.toString()) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn.');
    }

    await this.redis.del(redisKey);
    return true;
  }
}