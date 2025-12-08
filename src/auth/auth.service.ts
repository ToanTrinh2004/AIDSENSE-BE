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
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private emailService: EmailService,
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
    // Kiểm tra nếu người dùng đã tồn tại
    const { data: existingUser, error: selectError } = await this.checkIsExistingUser(email);
    if (selectError) {
      throw new BadRequestException("failed");
    }

    if (existingUser) {
      throw new BadRequestException('Already have an account');
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Lưu người dùng mới vào Supabase
    const { data, error } = await this.supabase
    .from('auth')
    .insert([{ email: signUpDto.email, password: hashedPassword,roles:'USER' }])
    .select()
    .single();

  if (error) {
    throw new BadRequestException(error.message);
  }
  console.log('New user data:', data);
  // Tạo JWT token
    const access_token = await this.jwtService.signAsync(
      { id: data.userId, email: data.email,role:data.roles },
      { secret: jwtConstants.secret }
    );


    const { error: userInsertError } = await this.supabase
    .from('users')
    .insert([
      {
        id: data.userId,
      }
    ]);

  if (userInsertError) {
    throw new BadRequestException("Failed to create user profile: " + userInsertError.message);
  }
    return {
      success: true,
      message: 'User registered successfully',
      access_token
    };
  }
  async signIn(signInDto : SignInDto): Promise<any> {
    const { email, password } = signInDto;
    const { data: existingUser, error: selectError } = await this.checkIsExistingUser(email);
    if (selectError) {
      throw new BadRequestException("failed");
    }

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

     //  Verify password
     const isPasswordValid = await bcrypt.compare(signInDto.password, existingUser.password);
     if (!isPasswordValid) {
       throw new BadRequestException('Invalid password');
     }
      // Tạo JWT token
    const access_token = await this.jwtService.signAsync(
      { id: existingUser.userId, email: existingUser.email,role:existingUser.roles },
      { secret: jwtConstants.secret }
    );
    return{
      success: true,
      message: 'User logged in successfully',
      access_token
    }
  }
  async sendOtp(email: string) {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 phút
  
    const { data, error } = await this.supabase
      .from('email_otps')
      .upsert({
        email: email,
        otp: otp,
        expires_at: expiresAt,
      });
  
    if (error) {
      console.log(error);
      throw new BadRequestException('Could not save OTP');
    }
  
    // send email
    await this.emailService.sendOtpMail(email, otp);
  
    return {
      success: true,
      message: 'OTP sent to email.',
    };
  }

  async verifyOtp(email: string, otp: string) {
    const { data, error } = await this.supabase
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .single();
  
    if (error || !data) throw new BadRequestException('OTP not found');
  
    if (data.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
  
    const now = new Date(); 
    const expiresAt = new Date(data.expires_at);
    expiresAt.setHours(expiresAt.getHours() + 7);
    console.log('Now:', now);
    console.log('Expires At:', expiresAt);
    
    if (now.getTime() > expiresAt.getTime()) {
      throw new BadRequestException('OTP expired');
    }
    
  
    return {
      success: true,
      message: 'Email verified successfully',
    };
  }
  async forgotPassword(email: string, newPassword: string, otp: string): Promise<any> {

    const { data: existingUser, error: selectError } = await this.checkIsExistingUser(email);
    if (!existingUser) {
      throw new BadRequestException('User not found');
    }
    const verifyResult = await this.verifyOtp(email, otp);
    if(verifyResult.success){
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const { data, error } = await this.supabase
      .from('auth')
      .update({ password: hashedPassword })
      .eq('email', email);
    if (error) {
      throw new BadRequestException('Could not update password');
    }
    return {
      success: true,
      message: 'Password updated successfully',
    };
    }else{
      throw new BadRequestException('OTP verification failed');
    }
  }
  
  
  
}
