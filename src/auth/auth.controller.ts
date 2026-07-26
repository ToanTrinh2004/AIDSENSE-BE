import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  SignupDto,
  SignInDto,
  SendOtpDto,
  VerifyOtpDto,
  ForgetPasswordDto,
  TeamEmailDto,
  TeamVerifyOtpDto,
} from './dto/auth-dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @HttpCode(201)
  @Post('register')
  async signUp(@Body() signUpDto: SignupDto) {
    return this.authService.signUp(signUpDto);
  }

  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Sai email hoặc mật khẩu' })
  @HttpCode(200)
  @Post('login')
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @ApiOperation({ summary: 'Gửi mã OTP về email' })
  @ApiResponse({ status: 200, description: 'Gửi OTP thành công' })
  @HttpCode(200)
  @Post('email')
  async sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body.email, body.type);
  }

  @ApiOperation({ summary: 'Xác thực mã OTP' })
  @ApiResponse({ status: 200, description: 'Xác thực OTP thành công' })
  @ApiResponse({ status: 400, description: 'OTP không hợp lệ hoặc hết hạn' })
  @HttpCode(200)
  @Post('email/otp')
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @ApiOperation({ summary: 'Đặt lại mật khẩu quên' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'OTP không hợp lệ hoặc mật khẩu không khớp' })
  @HttpCode(200)
  @Patch('forget-password')
  async forgetPassword(@Body() body: ForgetPasswordDto) {
    return this.authService.forgotPassword(
      body.email,
      body.password,
      body.confirmPassword,
      body.otp,
    );
  }

  @ApiOperation({ summary: 'Gửi OTP cho trưởng nhóm' })
  @ApiResponse({ status: 200, description: 'Gửi OTP thành công' })
  @HttpCode(200)
  @Post('team/otp')
  async sendOtpToTeamLeader(@Body() body: TeamEmailDto) {
    return this.authService.sendOtpToTeamLeader(body.email);
  }

  @ApiOperation({ summary: 'Xác thực OTP cho trưởng nhóm' })
  @ApiResponse({ status: 200, description: 'Xác thực thành công' })
  @HttpCode(200)
  @Post('team/verify')
  async verifyOtpForTeamLeader(@Body() body: TeamVerifyOtpDto) {
    return this.authService.verifyOtpForTeamLeader(body.email, body.otp);
  }
}