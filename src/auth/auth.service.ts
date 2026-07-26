// auth.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseClient } from '@supabase/supabase-js';
import { jwtConstants } from './constant';
import { SmsService, OtpVerifyResult } from './sms.service';
import Redis from 'ioredis';
import { SignupDto, SignInDto, OtpType } from './dto/auth-dto';
import { Messages } from '../utils/messages';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private smsService: SmsService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private readonly PENDING_SIGNUP_TTL = 600; // 10 phút
  private readonly OTP_VERIFIED_TTL = 600;

  private checkIsExistingUser(phone: string) {
    return this.supabase.from('auth').select('*').eq('phone', phone).maybeSingle();
  }

  // ── ĐĂNG KÝ ─────────────────────────────────────────────
  async signUp(dto: SignupDto) {
    const { phone, password, username } = dto;

    const { data: existingUser, error: selectError } = await this.checkIsExistingUser(phone);
    if (selectError) {
      throw new BadRequestException(Messages.cannotCheckUser);
    }
    if (existingUser) {
      throw new BadRequestException(Messages.phoneAlreadyRegistered);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Chưa ghi vào DB — chỉ lưu tạm ở Redis, chờ xác thực OTP
    await this.redis.set(
      `pending_signup:${phone}`,
      JSON.stringify({ password: hashedPassword, username }),
      'EX',
      this.PENDING_SIGNUP_TTL,
    );

    await this.smsService.sendOtp(phone);

    return { success: true, message: Messages.otpSentSignup };
  }

  private async finalizeSignUp(phone: string) {
    const pendingRaw = await this.redis.get(`pending_signup:${phone}`);
    if (!pendingRaw) {
      throw new BadRequestException(Messages.signupRequestExpired);
    }
    const { password, username } = JSON.parse(pendingRaw);

    const { data: existingUser } = await this.checkIsExistingUser(phone);
    if (existingUser) {
      await this.redis.del(`pending_signup:${phone}`);
      throw new BadRequestException(Messages.phoneAlreadyRegistered);
    }

    const { data, error } = await this.supabase
      .from('auth')
      .insert([{ phone, password }])
      .select()
      .single();
    if (error) {
      throw new BadRequestException({
        vi: `${Messages.cannotCreateAccount.vi}: ${error.message}`,
        en: `${Messages.cannotCreateAccount.en}: ${error.message}`,
      });
    }

    const { error: userInsertError } = await this.supabase
      .from('users')
      .insert([{ id: data.userId, roles: 'USER', username, phone }]);
    if (userInsertError) {
      throw new BadRequestException({
        vi: `${Messages.cannotCreateProfile.vi}: ${userInsertError.message}`,
        en: `${Messages.cannotCreateProfile.en}: ${userInsertError.message}`,
      });
    }

    await this.redis.del(`pending_signup:${phone}`);

    const access_token = await this.jwtService.signAsync(
      { id: data.userId, phone, role: 'USER' },
      { secret: jwtConstants.secret },
    );

    return { success: true, message: Messages.signupSuccess, access_token };
  }

  // ── OTP ─────────────────────────────────────────────────
  async sendOtp(phone: string, type: OtpType) {
    if (type === OtpType.FORGOT_PASSWORD) {
      const { data: existingUser } = await this.checkIsExistingUser(phone);
      if (!existingUser) {
        throw new BadRequestException(Messages.phoneNotRegistered);
      }
    }
    if (type === OtpType.SIGNUP) {
      const pending = await this.redis.get(`pending_signup:${phone}`);
      if (!pending) {
        throw new BadRequestException(Messages.signupNotFound);
      }
    }

    await this.smsService.sendOtp(phone);

    return { success: true, message: Messages.otpSent };
  }

  async verifyOtp(phone: string, otp: number, type: OtpType) {
    const result = await this.smsService.verifyOtp(phone, otp.toString());

    if (result === OtpVerifyResult.EXPIRED) {
      throw new BadRequestException(Messages.otpExpired);
    }
    if (result === OtpVerifyResult.MISMATCH) {
      throw new BadRequestException(Messages.otpInvalid);
    }

    // result === SUCCESS
    if (type === OtpType.SIGNUP) {
      return this.finalizeSignUp(phone);
    }

    if (type === OtpType.FORGOT_PASSWORD) {
      await this.redis.set(`otp_verified:${phone}`, '1', 'EX', this.OTP_VERIFIED_TTL);
      return { success: true, message: Messages.otpVerifiedSetNewPassword };
    }

    throw new BadRequestException(Messages.invalidOtpType);
  }

  // ── ĐĂNG NHẬP ───────────────────────────────────────────
  async signIn(dto: SignInDto) {
    const { phone, password } = dto;
    const { data: existingUser, error: selectError } = await this.checkIsExistingUser(phone);
    if (selectError) {
      throw new BadRequestException({
        vi: `${Messages.cannotCheckUser.vi}: ${selectError.message}`,
        en: `${Messages.cannotCheckUser.en}: ${selectError.message}`,
      });
    }
    if (!existingUser) {
      throw new BadRequestException(Messages.invalidCredentials);
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) {
      throw new BadRequestException(Messages.invalidCredentials);
    }

    const { data: userData, error: userDataError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', existingUser.userId)
      .single();
    if (userDataError) {
      throw new BadRequestException({
        vi: `${Messages.cannotFetchUserData.vi}: ${userDataError.message}`,
        en: `${Messages.cannotFetchUserData.en}: ${userDataError.message}`,
      });
    }

    const access_token = await this.jwtService.signAsync(
      { id: existingUser.userId, phone: existingUser.phone, role: userData.roles },
      { secret: jwtConstants.secret },
    );

    return { success: true, message: Messages.loginSuccess, access_token, user: userData };
  }

  // ── QUÊN MẬT KHẨU ───────────────────────────────────────
  async forgotPassword(phone: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException(Messages.passwordMismatch);
    }

    const verifiedFlag = await this.redis.get(`otp_verified:${phone}`);
    if (!verifiedFlag) {
      throw new BadRequestException(Messages.otpNotVerified);
    }

    const { data: existingUser } = await this.checkIsExistingUser(phone);
    if (!existingUser) {
      throw new BadRequestException(Messages.userNotFound);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { error } = await this.supabase
      .from('auth')
      .update({ password: hashedPassword })
      .eq('phone', phone);
    if (error) {
      throw new BadRequestException(Messages.cannotUpdatePassword);
    }

    await this.redis.del(`otp_verified:${phone}`);

    const access_token = await this.jwtService.signAsync(
      { id: existingUser.userId, phone, role: 'USER' },
      { secret: jwtConstants.secret },
    );

    return { success: true, message: Messages.passwordUpdateSuccess, access_token };
  }

  // ── TEAM LEADER OTP ─────────────────────────────────────
  async sendOtpToTeamLeader(phone: string) {
    try {
      await this.smsService.sendOtp(phone);
      return { success: true, message: Messages.otpSent };
    } catch (error) {
      throw new BadRequestException(Messages.cannotSendOtp);
    }
  }

  async verifyOtpForTeamLeader(phone: string, otp: number) {
    const result = await this.smsService.verifyOtp(phone, otp.toString());

    if (result === OtpVerifyResult.EXPIRED) {
      throw new BadRequestException(Messages.otpExpired);
    }
    if (result === OtpVerifyResult.MISMATCH) {
      throw new BadRequestException(Messages.otpInvalid);
    }

    return { success: true, message: Messages.otpVerifySuccess };
  }
}