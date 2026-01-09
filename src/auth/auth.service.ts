import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from './dto/sign-up.dto';
import * as bcrypt from 'bcrypt';
import { SupabaseClient } from '@supabase/supabase-js';
import { jwtConstants } from './constant';
import { SignInDto } from './dto/sign-in.dto';
import { EmailService } from './email.service';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private emailService: EmailService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private checkIsExistingUser(email: string) {
    return this.supabase
      .from('auth')
      .select('*')
      .eq('email', email)
      .maybeSingle();
  }

  async signUp(signUpDto: SignupDto): Promise<any> {
    const { email, password } = signUpDto;
    const { data: existingUser, error: selectError } = await this.checkIsExistingUser(email);
    if (selectError) {
      throw new BadRequestException('Không thể kiểm tra người dùng.');
    }

    if (existingUser) {
      throw new BadRequestException('Tài khoản đã tồn tại.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await this.supabase
      .from('auth')
      .insert([{ email: signUpDto.email, password: hashedPassword }])
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Không thể tạo tài khoản: ' + error.message);
    }

    const access_token = await this.jwtService.signAsync(
      { id: data.userId, email: data.email, role: "USER" },
      { secret: jwtConstants.secret },
    );

    const { error: userInsertError } = await this.supabase
      .from('users')
      .insert([{ id: data.userId, roles: 'USER',username: signUpDto.username, phone: signUpDto.phone }]);

    if (userInsertError) {
      throw new BadRequestException('Không thể tạo hồ sơ người dùng: ' + userInsertError.message);
    }

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      access_token,
    };
  }

  async signIn(signInDto: SignInDto): Promise<any> {
    try {
      const { email, password } = signInDto;
      const { data: existingUser, error: selectError } = await this.checkIsExistingUser(email);
      if (selectError) {
        throw new BadRequestException('Không thể kiểm tra người dùng: ' + selectError.message);
      }

      if (!existingUser) {
        throw new BadRequestException('Thông tin đăng nhập không hợp lệ.');
      }

      const isPasswordValid = await bcrypt.compare(password, existingUser.password);
      if (!isPasswordValid) {
        throw new BadRequestException('Thông tin đăng nhập không hợp lệ.');
      }

      const { data: userData, error: userDataError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', existingUser.userId)
        .single();
      if (userDataError) {
        throw new BadRequestException('Không thể lấy dữ liệu người dùng: ' + userDataError.message);
      }

      const access_token = await this.jwtService.signAsync(
        { id: existingUser.userId, email: existingUser.email, role: userData.roles },
        { secret: jwtConstants.secret },
      );

      return {
        success: true,
        message: 'Đăng nhập thành công.',
        access_token,
        user: userData,
      };
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      throw new BadRequestException('Sai tên đăng nhập hoặc mật khẩu.');
    }
  }

  async sendOtp(email: string, type: string) {
    if(type === 'forgotpassword'){ 
      const checkIsExistingUser = await this.checkIsExistingUser(email);
      if (!checkIsExistingUser.data) {
        throw new BadRequestException('Tài khoản chưa được đăng ký.');
      }
    }
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    

    const { data, error } = await this.supabase
      .from('email_otps')
      .upsert({
        email: email,
        otp: otp,
        expires_at: expiresAt,
      });

    if (error) {
      throw new BadRequestException('Không thể lưu OTP.');
    }

    await this.emailService.sendOtpMail(email, otp);

    return {
      success: true,
      message: 'OTP đã được gửi đến email.',
    };
  }

  async verifyOtp(email: string, otp: number) {
    const otpString = otp.toString();
    const { data, error } = await this.supabase
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      throw new BadRequestException('Không tìm thấy OTP.');
    }

    if (data.otp !== otpString) {
      throw new BadRequestException('OTP không hợp lệ.');
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    expiresAt.setHours(expiresAt.getHours() + 7);

    if (now.getTime() > expiresAt.getTime()) {
      throw new BadRequestException('OTP đã hết hạn.');
    }

    return {
      success: true,
      message: 'Xác thực email thành công.',
    };
  }

  async forgotPassword(email: string, password: string, confirmPassword: string, otp: number): Promise<any> {
    
    const { data: existingUser } = await this.checkIsExistingUser(email);
    if (!existingUser) {
      throw new BadRequestException('Không tìm thấy người dùng.');
    }

    const verifyResult = await this.verifyOtp(email, otp);
    if (verifyResult.success) {
      if (password !== confirmPassword) {
        throw new BadRequestException('Mật khẩu không khớp.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const { error } = await this.supabase
        .from('auth')
        .update({ password: hashedPassword })
        .eq('email', email);

      if (error) {
        throw new BadRequestException('Không thể cập nhật mật khẩu.');
      }

      return {
        success: true,
        message: 'Cập nhật mật khẩu thành công.',
      };
    } else {
      throw new BadRequestException('Xác thực OTP thất bại.');
    }
  }
  async sendOtpToTeamLeader(email: string) {
    const otp = this.generateOtp(); // Generate a 6-digit OTP
    const expiresInSeconds = 5 * 60; // OTP expiration time (5 minutes)
  
    try {
      // Store the OTP in Redis with an expiration time
      await this.redis.set(`team_leader_otp:${email}`, otp, 'EX', expiresInSeconds);
  
      // Send the OTP to the team leader's email
      await this.emailService.sendOtpToTeamLeader(email, otp);
  
      return {
        success: true,
        message: 'OTP đã được gửi đến email.',
      };
    } catch (error) {
      console.error('Error sending OTP to team leader:', error);
      throw new BadRequestException('Không thể gửi OTP.');
    }
  }
  async verifyOtpForTeamLeader(email: string, otp: number) {
    try {
      // Retrieve the OTP from Redis
      const storedOtp = await this.redis.get(`team_leader_otp:${email}`);
  
      if (!storedOtp) {
        throw new BadRequestException('OTP đã hết hạn hoặc không tồn tại.');
      }
  
      if (storedOtp !== String(otp)) {
        throw new BadRequestException('OTP không hợp lệ.');
      }
  
      
      return {
        success: true,
        message: 'Xác thực OTP thành công.',
      };
    } catch (error) {
      console.error('Error verifying OTP for team leader:', error);
      throw new BadRequestException('Không thể xác thực OTP.');
    }
  }
}
