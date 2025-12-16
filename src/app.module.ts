import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SosModule } from './sos/sos.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './auth/constant';
import { CloudinaryService } from './cloudinary/cloudinary.service';
import { UserModule } from './user/user.module';
import { TeamModule } from './team/team.module';
import { EventsModule } from './events/events.module';
import { AdminModule } from './admin/admin.module';
import { RedisProvider } from './RedisService';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }), SupabaseModule, AuthModule, SosModule,
  JwtModule.register({
    global: true,
    secret: jwtConstants.secret,
    signOptions: { expiresIn: '1d' },
  }),
  UserModule,
  TeamModule,
  EventsModule,
  AdminModule,],

  controllers: [AppController],
  providers: [AppService,CloudinaryService,RedisProvider],
})
export class AppModule { }
