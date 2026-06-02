import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constant';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { RedisProvider } from 'src/RedisService';

@Module({
  imports: [
    
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, SmsService, RedisProvider],
})
export class AuthModule {}