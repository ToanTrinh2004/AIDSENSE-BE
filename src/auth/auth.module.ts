import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constant';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';


@Module({
  imports: [
    
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, SmsService],
})
export class AuthModule {}