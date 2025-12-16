import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  @HttpCode(201)
  @Post('register')
  async signUp(@Body() signUpDto: any) {
    return this.authService.signUp(signUpDto);
  }
  @HttpCode(200)
  @Post('login')
  async signIn(@Body() signInDto: any) {
    return this.authService.signIn(signInDto);
  }
  @HttpCode(200)
  @Post('email')
  async sendOtp(@Body('email') email: string) {
    return this.authService.sendOtp(email);
  }
  @HttpCode(200)
  @Post('email/otp')
  async verifyOtp(@Body() body: { email: string; otp: number }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }
 
  @HttpCode(200)
  @Patch('forget-password')
  async forgetPassword(@Body() body: { email: string; password: string; confirmPassword:string; otp: number }) {
    return this.authService.forgotPassword(body.email, body.password,body.confirmPassword, body.otp);
  }
  @HttpCode(200)
  @Post('team/otp')
  async sendOtpToTeamLeader(@Body('email') email: string) {
    return this.authService.sendOtpToTeamLeader(email);
  }
  @HttpCode(200)
  @Post('team/verify')
  async verifyOtpForTeamLeader(
    @Body('email') email: string,
    @Body('otp') otp: number,
  ) {
    return this.authService.verifyOtpForTeamLeader(email, otp);
  }
}
