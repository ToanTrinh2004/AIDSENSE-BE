import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constant';
import { EmailService } from './email.service';

@Module({
  imports: [
    
  ],
  controllers: [AuthController],
  providers: [AuthService,EmailService],
})
export class AuthModule {}
