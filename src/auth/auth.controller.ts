import { Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  SignupDto,
  SignInDto,
  SendOtpDto,
  VerifyOtpDto,
  ForgetPasswordDto,
  TeamPhoneDto,
  TeamVerifyOtpDto,
} from './dto/auth-dto';
import { AuthGuard } from './auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  userService: any;
  constructor(private readonly authService: AuthService) { }

  // ================= REGISTER =================

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register account' })
  @ApiResponse({ status: 201, description: 'OTP sent successfully' })
  async signUp(@Body() dto: SignupDto) {
    return this.authService.signUp(dto);
  }

  // ================= LOGIN =================

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  // ================= SEND OTP =================

  @Post('otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone, dto.type);
  }

  // ================= VERIFY OTP =================

  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp, dto.type);
  }

  // ================= FORGOT PASSWORD =================

  @Patch('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  async forgotPassword(@Body() dto: ForgetPasswordDto) {
    return this.authService.forgotPassword(
      dto.phone,
      dto.password,
      dto.confirmPassword,
    );
  }

  // ================= TEAM LEADER =================

  @Post('team/otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send OTP to team leader' })
  async sendOtpToTeamLeader(@Body() dto: TeamPhoneDto) {
    return this.authService.sendOtpToTeamLeader(dto.phone);
  }

  @Post('team/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify team leader OTP' })
  async verifyOtpForTeamLeader(@Body() dto: TeamVerifyOtpDto) {
    return this.authService.verifyOtpForTeamLeader(dto.phone, dto.otp);
  }
  
}